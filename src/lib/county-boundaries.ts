/**
 * County boundary resolver — loads real US county GeoJSON polygons
 * from the US Census Bureau's simplified TopoJSON atlas.
 *
 * Source: https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json (~600KB)
 */
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

// FIPS code → GeoJSON polygon cache
let countyMap: Map<string, GeoJSON.Feature> | null = null
let loadPromise: Promise<void> | null = null

// State abbreviation → FIPS code prefix
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25',
  MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32',
  NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47',
  TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56', DC: '11',
}

// State full name → abbreviation
const STATE_NAMES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

/**
 * Map from area description → county FIPS codes.
 * For metro areas, maps to the primary county.
 * Multiple FIPS = multi-county metro (we use the first/primary).
 */
const AREA_TO_FIPS: Record<string, string[]> = {
  // Michigan
  'plainwell / allegan county, mi': ['26005'],           // Allegan County
  'holland / zeeland, mi': ['26139'],                     // Ottawa County
  'muskegon county, mi': ['26121'],                       // Muskegon County
  'grand rapids / kent county, mi': ['26081'],            // Kent County
  'lansing / east lansing, mi': ['26065'],                // Ingham County
  'kalamazoo, mi': ['26077'],                             // Kalamazoo County
  'detroit metro, mi': ['26163'],                         // Wayne County

  // Major metros
  'nashville metro, tn': ['47037'],                       // Davidson County
  'san antonio, tx': ['48029'],                           // Bexar County
  'phoenix / scottsdale, az': ['04013'],                  // Maricopa County
  'denver metro, co': ['08031'],                          // Denver County
  'las vegas / henderson, nv': ['32003'],                 // Clark County
  'chicago metro, il': ['17031'],                         // Cook County
  'charlotte metro, nc': ['37119'],                       // Mecklenburg County
  'san francisco bay area, ca': ['06075'],                // San Francisco County
  'minneapolis / st. paul, mn': ['27053'],                // Hennepin County
  'orlando / central fl': ['12095'],                      // Orange County
  'atlanta metro, ga': ['13121'],                         // Fulton County
  'philadelphia metro, pa': ['42101'],                    // Philadelphia County
  'los angeles metro, ca': ['06037'],                     // Los Angeles County
  'boston metro, ma': ['25025'],                           // Suffolk County
  'dallas / fort worth, tx': ['48113'],                   // Dallas County
  'seattle / bellevue, wa': ['53033'],                    // King County
  'new york city metro': ['36061'],                       // New York County (Manhattan)
  'washington d.c. metro': ['11001'],                     // District of Columbia
  'miami / broward, fl': ['12086'],                       // Miami-Dade County
  'portland metro, or': ['41051'],                        // Multnomah County
  'tampa / st. pete, fl': ['12057'],                      // Hillsborough County
  'raleigh / durham, nc': ['37183'],                      // Wake County
  'houston metro, tx': ['48201'],                         // Harris County
  'austin metro, tx': ['48453'],                          // Travis County
  'san diego, ca': ['06073'],                             // San Diego County
  'salt lake city, ut': ['49035'],                        // Salt Lake County
  'sacramento, ca': ['06067'],                            // Sacramento County
  'scottsdale, az': ['04013'],                            // Maricopa County
  'austin, tx': ['48453'],                                // Travis County
  'austin county, texas': ['48453'],                      // Travis County
  'travis county, texas': ['48453'],                      // Travis County

  // Additional areas from agent data
  'san antonio / new braunfels, tx': ['48029'],           // Bexar County
  'austin / travis county, tx': ['48453'],                // Travis County
  'columbus / central oh': ['39049'],                     // Franklin County
  'miami beach / coral gables, fl': ['12086'],            // Miami-Dade County
  'bellevue / eastside, wa': ['53033'],                   // King County
  'scottsdale / paradise valley, az': ['04013'],          // Maricopa County
  'chicago gold coast / lincoln park': ['17031'],         // Cook County
  'boulder / westminster, co': ['08013'],                 // Boulder County
  'aspen / snowmass, co': ['08097'],                      // Pitkin County
  'palm beach / jupiter, fl': ['12099'],                  // Palm Beach County
  'buckhead / midtown, ga': ['13121'],                    // Fulton County
  'salt lake city / park city, ut': ['49035'],            // Salt Lake County
}

/** Load the US counties TopoJSON from CDN */
async function loadCounties(): Promise<void> {
  if (countyMap) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json')
      const topo = (await res.json()) as Topology
      const geojson = feature(topo, topo.objects.counties as GeometryCollection)
      countyMap = new Map()

      for (const feat of geojson.features) {
        const fips = String(feat.id).padStart(5, '0')
        countyMap.set(fips, feat)
      }
    } catch (err) {
      console.error('[CountyBoundaries] Failed to load:', err)
      countyMap = new Map() // empty map so we don't retry
    }
  })()

  return loadPromise
}

/**
 * Get the real county polygon coordinates for a given area string.
 * Returns an array of [lat, lng] pairs (Leaflet format), or null if not found.
 */
export async function getCountyPolygon(area: string): Promise<[number, number][][] | null> {
  await loadCounties()
  if (!countyMap || countyMap.size === 0) return null

  const areaLower = area.toLowerCase().trim()

  // 1. Direct lookup from our mapping table
  const fipsList = AREA_TO_FIPS[areaLower]
  if (fipsList) {
    const feat = countyMap.get(fipsList[0])
    if (feat) return geoJsonToLeaflet(feat)
  }

  // 2. Try parsing "X County, ST" pattern
  const countyMatch = areaLower.match(/([a-z\s]+)\s*county[,\s]+(\w+)/)
  if (countyMatch) {
    const countyName = countyMatch[1].trim()
    const stateRaw = countyMatch[2].trim()
    const stateAbbr = stateRaw.length === 2 ? stateRaw.toUpperCase() : STATE_NAMES[stateRaw.toLowerCase()]
    if (stateAbbr) {
      const stateFips = STATE_FIPS[stateAbbr]
      if (stateFips) {
        // Search countyMap for matching county name in this state
        // We need the county names from the atlas — use a name lookup API
        // For now, try all counties in this state
        for (const [fips, feat] of countyMap) {
          if (fips.startsWith(stateFips)) {
            return geoJsonToLeaflet(feat)
          }
        }
      }
    }
  }

  return null
}

/**
 * Preload all county polygons for a list of agents.
 * Returns a map of agentId → polygon coordinates.
 */
export async function preloadAgentCounties(
  agents: { id: string; area: string; polygon?: [number, number][] }[]
): Promise<Map<string, [number, number][][]>> {
  await loadCounties()
  const result = new Map<string, [number, number][][]>()
  if (!countyMap || countyMap.size === 0) return result

  for (const agent of agents) {
    const areaLower = agent.area.toLowerCase().trim()

    // Direct lookup
    const fipsList = AREA_TO_FIPS[areaLower]
    if (fipsList) {
      const feat = countyMap.get(fipsList[0])
      if (feat) {
        const coords = geoJsonToLeaflet(feat)
        if (coords) result.set(agent.id, coords)
        continue
      }
    }

    // Try county pattern
    const countyMatch = areaLower.match(/([a-z\s]+)\s*county[,\s]+(\w+)/)
    if (countyMatch) {
      const stateRaw = countyMatch[2].trim()
      const stateAbbr = stateRaw.length === 2 ? stateRaw.toUpperCase() : STATE_NAMES[stateRaw.toLowerCase()]
      if (stateAbbr) {
        const stateFips = STATE_FIPS[stateAbbr]
        if (stateFips) {
          // Find the right county — search by process of elimination
          // The FIPS is state(2) + county(3), so we match the state prefix
          // and use the agent's existing polygon center to find the closest county
          if (agent.polygon && agent.polygon.length >= 3) {
            const centerLat = agent.polygon.reduce((s, p) => s + p[0], 0) / agent.polygon.length
            const centerLng = agent.polygon.reduce((s, p) => s + p[1], 0) / agent.polygon.length

            let bestFips = ''
            let bestDist = Infinity

            for (const [fips, feat] of countyMap) {
              if (!fips.startsWith(stateFips)) continue
              const bbox = getBbox(feat)
              if (!bbox) continue
              const cLat = (bbox[1] + bbox[3]) / 2
              const cLng = (bbox[0] + bbox[2]) / 2
              const dist = Math.abs(cLat - centerLat) + Math.abs(cLng - centerLng)
              if (dist < bestDist) {
                bestDist = dist
                bestFips = fips
              }
            }

            if (bestFips) {
              const feat = countyMap.get(bestFips)
              if (feat) {
                const coords = geoJsonToLeaflet(feat)
                if (coords) result.set(agent.id, coords)
              }
            }
          }
        }
      }
    }
  }

  return result
}

/** Convert GeoJSON Feature to Leaflet-compatible [lat, lng][] arrays */
function geoJsonToLeaflet(feat: GeoJSON.Feature): [number, number][][] | null {
  const geom = feat.geometry
  if (geom.type === 'Polygon') {
    return geom.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as [number, number])
    )
  } else if (geom.type === 'MultiPolygon') {
    // Return all polygon rings flattened
    return geom.coordinates.flatMap((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as [number, number])
      )
    )
  }
  return null
}

/** Get bounding box of a GeoJSON feature */
function getBbox(feat: GeoJSON.Feature): [number, number, number, number] | null {
  const coords: number[][] = []
  const geom = feat.geometry
  if (geom.type === 'Polygon') {
    geom.coordinates[0].forEach((c) => coords.push(c))
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((p) => p[0].forEach((c) => coords.push(c)))
  }
  if (coords.length === 0) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}
