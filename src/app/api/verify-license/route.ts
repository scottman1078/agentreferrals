import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ARELLO LVWS v2 endpoint
const ARELLO_URL = 'https://www.arello.com/lvws/v2/'

interface ArelloResult {
  licenseNumber?: string
  firstName?: string
  lastName?: string
  status?: string
  expirationDate?: string
  licenseType?: string
  jurisdiction?: string
}

interface ArelloResponse {
  searchTier?: string
  searchesThisMonth?: number
  results?: ArelloResult[]
  error?: string
}

// POST /api/verify-license
// Body: { userId, licenseNumber, licenseState, fullName }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, licenseNumber, licenseState, fullName } = body

  if (!userId || !licenseNumber || !licenseState) {
    return NextResponse.json(
      { error: 'userId, licenseNumber, and licenseState are required' },
      { status: 400 }
    )
  }

  // Split name for ARELLO lookup
  const nameParts = (fullName || '').trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const arelloUser = process.env.ARELLO_USERNAME
  const arelloPass = process.env.ARELLO_PASSWORD

  // If ARELLO credentials aren't configured, fall back to manual/pending verification
  if (!arelloUser || !arelloPass) {
    console.warn('[verify-license] ARELLO credentials not configured — marking as pending')

    const supabase = createAdminClient()
    await supabase
      .from('ar_profiles')
      .update({
        license_number: licenseNumber.trim(),
        license_state: licenseState.trim().toUpperCase(),
        license_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    return NextResponse.json({
      verified: false,
      pending: true,
      message: 'License saved. Verification is pending — ARELLO API not configured.',
    })
  }

  // Call ARELLO LVWS v2
  try {
    const params = new URLSearchParams({
      username: arelloUser,
      password: arelloPass,
      licenseNumber: licenseNumber.trim(),
      lastName,
      firstName,
      maxResults: '5',
      searchMode: 'live',
    })

    const arelloRes = await fetch(ARELLO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!arelloRes.ok) {
      console.error('[verify-license] ARELLO HTTP error:', arelloRes.status)
      return NextResponse.json(
        { error: 'License verification service unavailable' },
        { status: 502 }
      )
    }

    const data: ArelloResponse = await arelloRes.json()

    if (data.error) {
      console.error('[verify-license] ARELLO error:', data.error)
      return NextResponse.json(
        { error: 'License verification failed', detail: data.error },
        { status: 502 }
      )
    }

    // Check if any result matches the submitted license number
    const match = data.results?.find(
      (r) =>
        r.licenseNumber?.replace(/\s/g, '').toLowerCase() ===
        licenseNumber.trim().replace(/\s/g, '').toLowerCase()
    )

    const verified = !!match && match.status?.toLowerCase() === 'active'

    // Update the profile
    const supabase = createAdminClient()
    const { error: updateError } = await supabase
      .from('ar_profiles')
      .update({
        license_number: licenseNumber.trim(),
        license_state: licenseState.trim().toUpperCase(),
        license_verified: verified,
        license_verified_at: verified ? new Date().toISOString() : null,
        license_expiration: match?.expirationDate || null,
        license_type: match?.licenseType || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[verify-license] DB update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save verification result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      verified,
      pending: false,
      licenseStatus: match?.status || null,
      expirationDate: match?.expirationDate || null,
      licenseType: match?.licenseType || null,
      message: verified
        ? 'License verified successfully'
        : 'License could not be verified — check your license number and state',
    })
  } catch (err) {
    console.error('[verify-license] Unexpected error:', err)
    return NextResponse.json(
      { error: 'License verification service error' },
      { status: 500 }
    )
  }
}
