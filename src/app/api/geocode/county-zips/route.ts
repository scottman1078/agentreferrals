import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode/county-zips?county=Kalamazoo&state=MI
// Returns zip codes whose centroid falls within the given county
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

    if (!nomRes.ok) return NextResponse.json({ zips: [] })

    const nomResults = await nomRes.json()
    if (!nomResults?.length) return NextResponse.json({ zips: [] })

    const result = nomResults[0]
    const bbox = result.boundingbox
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (!bbox || bbox.length !== 4) return NextResponse.json({ zips: [] })

    const south = parseFloat(bbox[0])
    const north = parseFloat(bbox[1])
    const west = parseFloat(bbox[2])
    const east = parseFloat(bbox[3])

    // Step 2: Get all candidate zips in the bbox WITH their centroids
    const envelope = JSON.stringify({ xmin: west, ymin: south, xmax: east, ymax: north })
    const tigerUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/4/query?` +
      `geometry=${encodeURIComponent(envelope)}&` +
      `geometryType=esriGeometryEnvelope&` +
      `inSR=4326&` +
      `spatialRel=esriSpatialRelIntersects&` +
      `outFields=ZCTA5,CENTLAT,CENTLON&` +
      `returnGeometry=false&` +
      `f=json`

    const tigerRes = await fetch(tigerUrl)
    if (!tigerRes.ok) return NextResponse.json({ zips: [] })

    const tigerData = await tigerRes.json()
    interface ZipCandidate { zip: string; lat: number; lng: number }
    const candidates: ZipCandidate[] = (tigerData.features || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => ({
        zip: f.attributes?.ZCTA5,
        lat: parseFloat(f.attributes?.CENTLAT || '0'),
        lng: parseFloat(f.attributes?.CENTLON || '0'),
      }))
      .filter((c: ZipCandidate) => c.zip && c.lat !== 0)

    // Step 3: For each zip centroid, check if it falls inside the target county
    // Query TIGERweb Counties layer with each centroid point
    const COUNTY_QUERY_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query'
    const targetCounty = `${countyName} County`.toLowerCase()

    const verifiedZips: string[] = []

    // Process in parallel batches of 10
    for (let i = 0; i < candidates.length; i += 10) {
      const batch = candidates.slice(i, i + 10)
      const results = await Promise.all(
        batch.map(async (c) => {
          try {
            const point = JSON.stringify({ x: c.lng, y: c.lat })
            const url = `${COUNTY_QUERY_URL}?` +
              `geometry=${encodeURIComponent(point)}&` +
              `geometryType=esriGeometryPoint&` +
              `inSR=4326&` +
              `spatialRel=esriSpatialRelIntersects&` +
              `outFields=BASENAME&` +
              `returnGeometry=false&` +
              `f=json`
            const res = await fetch(url)
            if (!res.ok) return null
            const data = await res.json()
            const countyResult = data.features?.[0]?.attributes?.BASENAME?.toLowerCase() || ''
            // Check if this zip's centroid is in the target county
            if (countyResult === countyName.toLowerCase()) {
              return c.zip
            }
            return null
          } catch {
            return null
          }
        })
      )
      results.forEach((zip) => { if (zip) verifiedZips.push(zip) })
    }

    return NextResponse.json({
      zips: [...new Set(verifiedZips)].sort(),
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
