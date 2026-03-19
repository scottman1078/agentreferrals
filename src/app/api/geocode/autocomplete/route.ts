import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode/autocomplete?q=aus
// Returns place suggestions for US cities, counties, and states
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ', USA')}&` +
        `format=json&` +
        `limit=8&` +
        `countrycodes=us,ca&` +
        `addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AgentReferrals/1.0 (contact@agentdashboards.com)',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] })
    }

    const results = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestions = (results || []).map((r: any) => {
      const addr = r.address || {}
      const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || ''
      const county = addr.county || ''
      const state = addr.state || ''
      const stateCode = (addr['ISO3166-2-lvl4'] || addr.state_code || '').replace('US-', '').toUpperCase()

      // Build a display label — prefer "City, ST" format
      let label = ''
      let subtitle = ''
      const placeName = city || ''
      // It's a county result if there's no city name but there is a county,
      // or if the result name matches the county name
      const isCountyResult = (!placeName && county) ||
        (r.name && county && r.name.toLowerCase().includes('county'))

      if (placeName && stateCode) {
        label = `${placeName}, ${stateCode}`
        subtitle = 'City'
      } else if (isCountyResult && county && stateCode) {
        label = `${county}, ${stateCode}`
        subtitle = 'County'
      } else if (r.name && stateCode) {
        label = `${r.name}, ${stateCode}`
        subtitle = r.type || ''
      } else {
        label = r.display_name?.split(',').slice(0, 2).map((s: string) => s.trim()).join(', ') || r.display_name
      }

      // Skip results that are just countries or states with no city
      if (!placeName && !county) return null

      return {
        label,
        subtitle,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: r.type || 'place',
        city,
        county,
        state,
      }
    })

    // Remove nulls and deduplicate by label
    const valid = suggestions.filter(Boolean)
    const seen = new Set<string>()
    const unique = valid.filter((s: { label: string }) => {
      if (seen.has(s.label)) return false
      seen.add(s.label)
      return true
    })

    return NextResponse.json({ suggestions: unique })
  } catch (error) {
    console.error('[geocode/autocomplete] Error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
