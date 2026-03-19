import { NextRequest, NextResponse } from 'next/server'

interface ProfileBuilderRequest {
  fullName: string
  licenseNumber?: string
  primaryArea?: string
  brokerage?: string
  yearsLicensed?: number | null
  specializations?: string[]
  dealsPerYear?: number | null
  avgSalePrice?: number | null
}

interface ProposedProfile {
  bio: string
  specializations: string[]
  estimatedDealsPerYear: number | null
  estimatedAnnualVolume: string | null
  headshotUrl: string | null
  searchQueries: string[]
  source: 'generated' // MVP: generated from intake data. Future: 'web_search'
}

/**
 * POST /api/profile-builder/search
 *
 * Takes agent intake data and builds a proposed profile.
 * MVP: generates a bio and profile from intake data.
 * Future: will use web search to find public info about the agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body: ProfileBuilderRequest = await request.json()

    if (!body.fullName) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 })
    }

    const { fullName, primaryArea, brokerage, yearsLicensed, specializations, dealsPerYear, avgSalePrice } = body

    // Build search queries that would be used for web search (future enhancement)
    const searchQueries: string[] = []
    if (primaryArea) {
      searchQueries.push(`${fullName} real estate agent ${primaryArea}`)
    }
    if (brokerage) {
      searchQueries.push(`${fullName} realtor ${brokerage}`)
    }
    searchQueries.push(`${fullName} real estate agent`)

    // Generate a bio based on intake data
    const bio = generateBio({ fullName, primaryArea, brokerage, yearsLicensed, specializations, dealsPerYear })

    // Estimate annual volume from deals and avg price
    let estimatedAnnualVolume: string | null = null
    if (dealsPerYear && avgSalePrice) {
      const volume = dealsPerYear * avgSalePrice
      if (volume >= 1_000_000) {
        estimatedAnnualVolume = `$${(volume / 1_000_000).toFixed(1)}M`
      } else {
        estimatedAnnualVolume = `$${(volume / 1_000).toFixed(0)}K`
      }
    }

    const proposedProfile: ProposedProfile = {
      bio,
      specializations: specializations || [],
      estimatedDealsPerYear: dealsPerYear || null,
      estimatedAnnualVolume,
      headshotUrl: null, // Future: found via web search
      searchQueries,
      source: 'generated',
    }

    return NextResponse.json(proposedProfile)
  } catch (error) {
    console.error('[profile-builder/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateBio(data: {
  fullName: string
  primaryArea?: string
  brokerage?: string
  yearsLicensed?: number | null
  specializations?: string[]
  dealsPerYear?: number | null
}): string {
  const { fullName, primaryArea, brokerage, yearsLicensed, specializations, dealsPerYear } = data
  const firstName = fullName.split(' ')[0]

  const parts: string[] = []

  // Opening line
  if (yearsLicensed && yearsLicensed > 0) {
    if (primaryArea) {
      parts.push(`${firstName} is a licensed real estate agent with ${yearsLicensed} year${yearsLicensed !== 1 ? 's' : ''} of experience serving the ${primaryArea} market.`)
    } else {
      parts.push(`${firstName} is a licensed real estate agent with ${yearsLicensed} year${yearsLicensed !== 1 ? 's' : ''} of experience.`)
    }
  } else if (primaryArea) {
    parts.push(`${firstName} is a real estate agent serving the ${primaryArea} market.`)
  } else {
    parts.push(`${firstName} is a real estate professional focused on building strong referral partnerships.`)
  }

  // Brokerage
  if (brokerage) {
    parts.push(`Currently with ${brokerage}.`)
  }

  // Specializations
  if (specializations && specializations.length > 0) {
    if (specializations.length === 1) {
      parts.push(`Specializing in ${specializations[0].toLowerCase()}.`)
    } else {
      const last = specializations[specializations.length - 1].toLowerCase()
      const rest = specializations.slice(0, -1).map(s => s.toLowerCase()).join(', ')
      parts.push(`Specializing in ${rest}, and ${last}.`)
    }
  }

  // Volume
  if (dealsPerYear && dealsPerYear > 0) {
    parts.push(`Consistently closing ${dealsPerYear}+ transactions per year.`)
  }

  // Closing line
  parts.push(`Open to referral partnerships and committed to excellent communication with referral partners.`)

  return parts.join(' ')
}
