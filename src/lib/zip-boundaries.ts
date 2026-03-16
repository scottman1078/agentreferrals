/**
 * Fetch real ZCTA (Zip Code Tabulation Area) boundaries from the
 * US Census Bureau's TIGERweb ArcGIS REST service.
 *
 * Returns Leaflet-format [lat, lng][] coordinates for a given zip code.
 * Results are cached in-memory to avoid duplicate requests.
 */

type LatLng = [number, number]

const cache = new Map<string, LatLng[] | null>()

const TIGER_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2021/MapServer/0/query'

export async function getZipBoundary(zip: string): Promise<LatLng[] | null> {
  if (cache.has(zip)) return cache.get(zip) ?? null

  try {
    const params = new URLSearchParams({
      where: `ZCTA5='${zip}'`,
      outFields: 'ZCTA5',
      f: 'geojson',
      outSR: '4326',
    })

    const res = await fetch(`${TIGER_URL}?${params}`)
    const data = await res.json()

    if (!data.features || data.features.length === 0) {
      cache.set(zip, null)
      return null
    }

    const geom = data.features[0].geometry
    let ring: LatLng[] | null = null

    if (geom.type === 'Polygon') {
      ring = geom.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng] as LatLng)
    } else if (geom.type === 'MultiPolygon') {
      // Use the largest polygon ring
      let maxLen = 0
      for (const poly of geom.coordinates) {
        if (poly[0].length > maxLen) {
          maxLen = poly[0].length
          ring = poly[0].map(([lng, lat]: [number, number]) => [lat, lng] as LatLng)
        }
      }
    }

    cache.set(zip, ring)
    return ring
  } catch {
    cache.set(zip, null)
    return null
  }
}

/** Get the centroid of a zip boundary (for map centering) */
export function getCentroid(ring: LatLng[]): LatLng {
  const lat = ring.reduce((sum, [la]) => sum + la, 0) / ring.length
  const lng = ring.reduce((sum, [, ln]) => sum + ln, 0) / ring.length
  return [lat, lng]
}

/** Reverse geocode: given a lat/lng, find which ZCTA contains that point */
export async function getZipAtPoint(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'ZCTA5',
      f: 'json',
      inSR: '4326',
    })

    const res = await fetch(`${TIGER_URL}?${params}`)
    const data = await res.json()

    if (data.features && data.features.length > 0) {
      return data.features[0].attributes.ZCTA5
    }
  } catch { /* ignore */ }
  return null
}

/** WMS tile layer URL for showing all ZCTA boundaries on a Leaflet map */
export const ZCTA_WMS_URL = 'https://tigerweb.geo.census.gov/arcgis/services/TIGERweb/tigerWMS_ACS2021/MapServer/WMSServer'
export const ZCTA_WMS_LAYERS = '79'        // ZCTA boundaries layer
export const ZCTA_WMS_LABELS = '78'        // ZCTA labels layer
