/**
 * In-memory rate limiter for API routes.
 * Resets on server restart — sufficient for demo / dev usage.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

/**
 * Check whether a request from `ip` should be allowed.
 * @returns `true` if the request is within limits, `false` if rate-limited.
 */
export function checkRateLimit(
  ip: string,
  maxRequests = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

/**
 * Extract a client IP from the request headers.
 * Falls back to 'unknown' when no forwarding header is present.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
