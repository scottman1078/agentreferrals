import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

  try {
    // Try Nominatim (server-side, no CORS issues)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', USA')}&format=json&limit=1`,
      { headers: { 'User-Agent': 'AgentReferrals/1.0 (contact@agentdashboards.com)' } }
    )
    if (res.ok) {
      const results = await res.json()
      if (results && results.length > 0) {
        return NextResponse.json({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        })
      }
    }
  } catch {
    // Fall through
  }

  return NextResponse.json({ lat: null, lng: null })
}
