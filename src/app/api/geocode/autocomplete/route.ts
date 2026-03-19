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
        `q=${encodeURIComponent(q)}&` +
        `format=json&` +
        `limit=6&` +
        `countrycodes=us,ca&` +
        `addressdetails=1&` +
        `featuretype=city`,
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
      const city = addr.city || addr.town || addr.village || addr.hamlet || ''
      const county = addr.county || ''
      const state = addr.state || ''
      const stateCode = addr.state_code?.toUpperCase() || ''

      // Build a display label
      let label = r.display_name?.split(',').slice(0, 3).join(',').trim() || r.display_name
      // Prefer shorter format: "Austin, TX" or "Travis County, TX"
      if (city && stateCode) {
        label = `${city}, ${stateCode}`
      } else if (county && stateCode) {
        label = `${county}, ${stateCode}`
      } else if (state) {
        label = state
      }

      return {
        label,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: r.type || 'place',
        city,
        county,
        state,
      }
    })

    // Deduplicate by label
    const seen = new Set<string>()
    const unique = suggestions.filter((s: { label: string }) => {
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
