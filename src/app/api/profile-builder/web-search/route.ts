import { NextRequest, NextResponse } from 'next/server'

interface WebSearchRequest {
  fullName: string
  area?: string
  brokerage?: string
  licenseNumber?: string
}

interface SourceResult {
  platform: 'zillow'
  url: string
  totalTransactions: number | null
  rating: number | null
  found: boolean
}

/**
 * POST /api/profile-builder/web-search
 *
 * Searches for the agent's public profiles online.
 * Constructs likely Zillow profile URLs from the agent's name and attempts to verify them.
 */
export async function POST(request: NextRequest) {
  try {
    const body: WebSearchRequest = await request.json()

    if (!body.fullName) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 })
    }

    const { fullName } = body

    // Build candidate Zillow profile URLs from the name
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0]?.toLowerCase() || ''
    const lastName = nameParts[nameParts.length - 1]?.toLowerCase() || ''

    // Zillow screen names follow patterns like: firstlast, first-last, firstmlast
    const candidates: string[] = []
    if (firstName && lastName) {
      candidates.push(`${firstName}${lastName}`)           // jasontobrien
      candidates.push(`${firstName}-${lastName}`)          // jason-tobrien
      candidates.push(`${firstName}.${lastName}`)          // jason.tobrien
      // If there's a middle name/initial
      if (nameParts.length > 2) {
        const middle = nameParts[1]?.toLowerCase() || ''
        candidates.push(`${firstName}${middle[0]}${lastName}`)  // jasonmtobrien
        candidates.push(`${firstName}-${middle[0]}-${lastName}`) // jason-m-tobrien
      }
    }

    const sources: SourceResult[] = []

    // Try each candidate URL
    for (const screenName of candidates) {
      const url = `https://www.zillow.com/profile/${screenName}`

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(5000),
        })

        if (res.ok) {
          const html = await res.text()

          // Check if this is an actual profile page (not a redirect/404 page)
          const isProfilePage = html.includes('data-testid="profile-page"') ||
            html.includes('class="profile-content"') ||
            html.includes('"screenName"') ||
            (html.includes('zillow.com/profile') && !html.includes('Page Not Found'))

          if (isProfilePage) {
            // Try to parse basic data from the page
            let totalTransactions: number | null = null
            let rating: number | null = null

            // Look for sales count patterns
            const salesMatch = html.match(/(\d+)\s*(?:total\s+)?(?:sales|transactions|homes?\s+sold)/i)
            if (salesMatch) {
              totalTransactions = parseInt(salesMatch[1], 10)
            }

            // Look for rating
            const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of 5|\/5|stars?|rating)/i) ||
              html.match(/"averageRating":\s*(\d+\.?\d*)/)
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1])
            }

            sources.push({
              platform: 'zillow',
              url,
              totalTransactions,
              rating,
              found: true,
            })

            // Found a valid profile, no need to try more candidates
            break
          }
        }
      } catch {
        // Timeout or network error — continue trying other candidates
        continue
      }
    }

    // If no profile found, return a not-found result
    if (sources.length === 0) {
      sources.push({
        platform: 'zillow',
        url: `https://www.zillow.com/profile/${firstName}${lastName}`,
        totalTransactions: null,
        rating: null,
        found: false,
      })
    }

    return NextResponse.json({ sources })
  } catch (error) {
    console.error('[profile-builder/web-search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
