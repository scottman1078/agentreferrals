import { NextRequest, NextResponse } from 'next/server'

interface ZillowProfileResponse {
  totalTransactions: number | null
  reviewCount: number | null
  rating: number | null
  name: string | null
  found: boolean
  error?: string
}

/**
 * POST /api/profile-builder/zillow
 *
 * Fetches a public Zillow profile page and parses transaction/review data.
 * Expects: { zillowUrl: "https://www.zillow.com/profile/screenname" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { zillowUrl } = body as { zillowUrl?: string }

    if (!zillowUrl) {
      return NextResponse.json({ error: 'zillowUrl is required' }, { status: 400 })
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?zillow\.com\/profile\/.+/i
    if (!urlPattern.test(zillowUrl)) {
      return NextResponse.json(
        { error: 'Invalid Zillow profile URL. Expected format: https://www.zillow.com/profile/screenname' },
        { status: 400 }
      )
    }

    // Normalize URL
    const normalizedUrl = zillowUrl.startsWith('http') ? zillowUrl : `https://${zillowUrl}`

    const result: ZillowProfileResponse = {
      totalTransactions: null,
      reviewCount: null,
      rating: null,
      name: null,
      found: false,
    }

    try {
      const res = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json({ ...result, error: 'Profile not found' })
        }
        if (res.status === 403 || res.status === 429) {
          return NextResponse.json({ ...result, error: 'Zillow blocked the request. Try again later.' })
        }
        return NextResponse.json({ ...result, error: `Zillow returned status ${res.status}` })
      }

      const html = await res.text()

      // Check if this is a real profile page
      const isNotFound = html.includes('Page Not Found') ||
        html.includes('This page is no longer available') ||
        html.includes('404')
      if (isNotFound && !html.includes('zillow.com/profile')) {
        return NextResponse.json({ ...result, error: 'Profile not found' })
      }

      result.found = true

      // Parse name from page title or meta tags
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) {
        // Title format is usually "Name - Real Estate Agent - Zillow" or "Name | Zillow"
        const titleParts = titleMatch[1].split(/\s*[-|]\s*/)
        if (titleParts[0] && !titleParts[0].toLowerCase().includes('zillow')) {
          result.name = titleParts[0].trim()
        }
      }

      // Try to find name from structured data (JSON-LD)
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatch) {
        for (const block of jsonLdMatch) {
          try {
            const jsonStr = block.replace(/<\/?script[^>]*>/gi, '')
            const data = JSON.parse(jsonStr)
            if (data.name) result.name = data.name
            if (data.aggregateRating?.ratingValue) {
              result.rating = parseFloat(data.aggregateRating.ratingValue)
            }
            if (data.aggregateRating?.reviewCount) {
              result.reviewCount = parseInt(data.aggregateRating.reviewCount, 10)
            }
          } catch {
            // Invalid JSON-LD block, skip
          }
        }
      }

      // Parse total sales/transactions
      // Common patterns on Zillow profile pages
      const salesPatterns = [
        /(\d+)\s*(?:total\s+)?(?:sales|transactions|homes?\s+sold)/i,
        /"totalSales":\s*(\d+)/,
        /"pastSalesCount":\s*(\d+)/,
        /(\d+)\s*Past\s+Sales/i,
        /Past sales\s*[:\s]*(\d+)/i,
      ]

      for (const pattern of salesPatterns) {
        const match = html.match(pattern)
        if (match) {
          result.totalTransactions = parseInt(match[1], 10)
          break
        }
      }

      // Parse rating if not found via JSON-LD
      if (result.rating === null) {
        const ratingPatterns = [
          /"averageRating":\s*(\d+\.?\d*)/,
          /(\d+\.?\d*)\s*out of\s*5/i,
          /rating['":\s]*(\d+\.?\d*)/i,
        ]

        for (const pattern of ratingPatterns) {
          const match = html.match(pattern)
          if (match) {
            const val = parseFloat(match[1])
            if (val > 0 && val <= 5) {
              result.rating = val
              break
            }
          }
        }
      }

      // Parse review count if not found via JSON-LD
      if (result.reviewCount === null) {
        const reviewPatterns = [
          /"reviewCount":\s*(\d+)/,
          /(\d+)\s*reviews?/i,
          /Reviews?\s*\((\d+)\)/i,
        ]

        for (const pattern of reviewPatterns) {
          const match = html.match(pattern)
          if (match) {
            result.reviewCount = parseInt(match[1], 10)
            break
          }
        }
      }

      return NextResponse.json(result)
    } catch (fetchError) {
      // Network/timeout error
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      console.error('[profile-builder/zillow] Fetch error:', message)

      if (message.includes('timeout') || message.includes('abort')) {
        return NextResponse.json({ ...result, error: 'Request timed out. Zillow may be slow or blocking requests.' })
      }

      return NextResponse.json({ ...result, error: `Could not reach Zillow: ${message}` })
    }
  } catch (error) {
    console.error('[profile-builder/zillow] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
