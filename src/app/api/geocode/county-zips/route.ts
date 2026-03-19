import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode/county-zips?county=Kalamazoo&state=MI
// Returns all zip codes for a given US county using TIGERweb bbox envelope query
export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get('county')
  const state = request.nextUrl.searchParams.get('state')

  if (!county || !state) {
    return NextResponse.json({ zips: [], error: 'county and state required' }, { status: 400 })
  }

  try {
    const countyName = county.replace(/\s*County\s*/i, '').trim()

    // Step 1: Get county bounding box from Nominatim
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(`${countyName} County, ${state}, USA`)}&` +
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
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (!bbox || bbox.length !== 4) {
      return NextResponse.json({ zips: [] })
    }

    const south = parseFloat(bbox[0])
    const north = parseFloat(bbox[1])
    const west = parseFloat(bbox[2])
    const east = parseFloat(bbox[3])

    // Step 2: Query TIGERweb with bbox envelope — gets ALL zips in one request
    const envelope = JSON.stringify({ xmin: west, ymin: south, xmax: east, ymax: north })
    const tigerUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/4/query?` +
      `geometry=${encodeURIComponent(envelope)}&` +
      `geometryType=esriGeometryEnvelope&` +
      `inSR=4326&` +
      `spatialRel=esriSpatialRelIntersects&` +
      `outFields=ZCTA5&` +
      `returnGeometry=false&` +
      `f=json`

    const tigerRes = await fetch(tigerUrl)
    if (!tigerRes.ok) {
      return NextResponse.json({ zips: [] })
    }

    const tigerData = await tigerRes.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zips = (tigerData.features || []).map((f: any) => f.attributes?.ZCTA5).filter(Boolean)

    return NextResponse.json({
      zips: [...new Set(zips)].sort(),
      county: `${countyName} County`,
      state,
      lat,
      lng,
    })
  } catch (error) {
    console.error('[county-zips] Error:', error)
    return NextResponse.json({ zips: [], error: 'Failed to look up county zips' })
  }
}
