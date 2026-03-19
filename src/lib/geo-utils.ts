/**
 * Geometry utilities for point-in-polygon testing.
 * Uses the ray-casting algorithm.
 */

/**
 * Check if a point (lat, lng) is inside a polygon defined by an array of [lat, lng] pairs.
 * Uses the ray-casting (even-odd) algorithm.
 */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false

  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i][0]
    const xi = polygon[i][1]
    const yj = polygon[j][0]
    const xj = polygon[j][1]

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Find all agents whose polygon contains the given point.
 * Returns agents sorted by rcsScore descending (best first).
 */
export function findAgentsAtPoint(
  lat: number,
  lng: number,
  agents: { polygon: [number, number][]; rcsScore?: number }[]
): number[] {
  const matchingIndices: number[] = []

  for (let i = 0; i < agents.length; i++) {
    if (pointInPolygon(lat, lng, agents[i].polygon)) {
      matchingIndices.push(i)
    }
  }

  // Sort by rcsScore descending
  matchingIndices.sort((a, b) => {
    const scoreA = agents[a].rcsScore ?? 0
    const scoreB = agents[b].rcsScore ?? 0
    return scoreB - scoreA
  })

  return matchingIndices
}
