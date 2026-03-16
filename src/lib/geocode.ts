/**
 * Geocoding utility using Nominatim (OpenStreetMap).
 * Free, no API key required. Rate limit: 1 req/second.
 */

export interface GeoResult {
  lat: number
  lng: number
  display_name: string
  type?: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

/** General geocode — returns all result types (addresses, cities, etc.) */
export async function geocodeAddress(query: string): Promise<GeoResult[]> {
  if (!query || query.trim().length < 2) return []

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: '5',
    countrycodes: 'us,ca',
  })

  const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: { 'User-Agent': 'AgentReferrals' },
  })

  if (!res.ok) return []
  const data = await res.json()

  return data.map((item: { lat: string; lon: string; display_name: string; type: string }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display_name: item.display_name,
    type: item.type,
  }))
}

/** County/city-only geocode — for service area selection */
export async function geocodeCounty(query: string): Promise<GeoResult[]> {
  if (!query || query.trim().length < 2) return []

  // Search for counties first, then cities as fallback
  const countyQuery = query.includes('county') ? query : `${query} county`

  const [countyResults, cityResults] = await Promise.all([
    fetchNominatim(countyQuery, 'county'),
    fetchNominatim(query, 'city'),
  ])

  // Deduplicate and merge — counties first, then cities
  const seen = new Set<string>()
  const merged: GeoResult[] = []

  for (const r of [...countyResults, ...cityResults]) {
    const key = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(r)
    }
  }

  return merged.slice(0, 6)
}

async function fetchNominatim(query: string, featureType: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: '5',
    countrycodes: 'us,ca',
    featuretype: featureType,
  })

  try {
    const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': 'AgentReferrals' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((item: { lat: string; lon: string; display_name: string; type: string }) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
      type: item.type,
    }))
  } catch {
    return []
  }
}
