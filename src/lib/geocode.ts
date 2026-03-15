/**
 * Geocoding utility using Nominatim (OpenStreetMap).
 * Free, no API key required. Rate limit: 1 req/second.
 */

export interface GeoResult {
  lat: number
  lng: number
  display_name: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

export async function geocodeAddress(query: string): Promise<GeoResult[]> {
  if (!query || query.trim().length < 2) return []

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: '5',
    countrycodes: 'us',
  })

  const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: {
      'User-Agent': 'AgentReferrals',
    },
  })

  if (!res.ok) return []

  const data = await res.json()

  return data.map((item: { lat: string; lon: string; display_name: string }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display_name: item.display_name,
  }))
}
