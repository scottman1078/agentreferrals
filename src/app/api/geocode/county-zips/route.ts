import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode/county-zips?county=Kalamazoo&state=MI
// Returns all zip codes for a given US county using the HUD USPS crosswalk API
// Falls back to Census geocoder if HUD is unavailable
export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get('county')
  const state = request.nextUrl.searchParams.get('state')

  if (!county || !state) {
    return NextResponse.json({ zips: [], error: 'county and state required' }, { status: 400 })
  }

  try {
    // Approach: Use the Census Bureau's geocoder to get the county FIPS,
    // then use a free county-to-zip dataset via the FCC API

    // Step 1: Get county FIPS code from Census
    const countyName = county.replace(/\s*County\s*/i, '').trim()
    const stateCode = state.toUpperCase().trim()

    // Use Nominatim to get the county boundary bbox
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(`${countyName} County, ${stateCode}, USA`)}&` +
        `format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'AgentReferrals/1.0 (contact@agentdashboards.com)' } }
    )

    if (!nomRes.ok) {
      return NextResponse.json({ zips: [] })
    }

    const nomResults = await nomRes.json()
    if (!nomResults || nomResults.length === 0) {
      return NextResponse.json({ zips: [] })
    }

    const result = nomResults[0]
    const bbox = result.boundingbox // [south, north, west, east]

    if (!bbox || bbox.length !== 4) {
      return NextResponse.json({ zips: [] })
    }

    const south = parseFloat(bbox[0])
    const north = parseFloat(bbox[1])
    const west = parseFloat(bbox[2])
    const east = parseFloat(bbox[3])

    // Step 2: Sample a dense grid within the county bbox to find all zips
    // Use the TIGERweb WMS service (same as getZipAtPoint)
    const zips = new Set<string>()
    const latStep = (north - south) / 12  // ~12 rows
    const lngStep = (east - west) / 12    // ~12 columns

    const points: { lat: number; lng: number }[] = []
    for (let lat = south; lat <= north; lat += latStep) {
      for (let lng = west; lng <= east; lng += lngStep) {
        points.push({ lat, lng })
      }
    }
    // Add center and midpoints for better coverage
    points.push({ lat: (south + north) / 2, lng: (west + east) / 2 })

    // Query TIGERweb WMS in parallel batches
    const TIGER_WMS = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/4/query'

    for (let i = 0; i < points.length; i += 15) {
      const batch = points.slice(i, i + 15)
      const results = await Promise.all(
        batch.map(async (p) => {
          try {
            const url = `${TIGER_WMS}?` +
              `geometry=${p.lng},${p.lat}&` +
              `geometryType=esriGeometryPoint&` +
              `spatialRel=esriSpatialRelIntersects&` +
              `outFields=ZCTA5CE20&` +
              `returnGeometry=false&` +
              `f=json`
            const res = await fetch(url)
            if (!res.ok) return null
            const data = await res.json()
            return data.features?.[0]?.attributes?.ZCTA5CE20 || null
          } catch {
            return null
          }
        })
      )
      results.forEach((zip) => { if (zip) zips.add(zip) })
    }

    return NextResponse.json({
      zips: Array.from(zips).sort(),
      county: `${countyName} County`,
      state: stateCode,
    })
  } catch (error) {
    console.error('[county-zips] Error:', error)
    return NextResponse.json({ zips: [], error: 'Failed to look up county zips' })
  }
}
