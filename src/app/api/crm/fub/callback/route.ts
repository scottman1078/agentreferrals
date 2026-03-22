import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, computeExpiresAt, getCallbackUrl, FUB_CONFIG } from '@/lib/integration-utils'

// GET /api/crm/fub/callback — OAuth callback from Follow Up Boss
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=auth_denied', request.url))
  }

  try {
    const redirectUri = getCallbackUrl('fub')

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens({
      tokenUrl: FUB_CONFIG.tokenUrl,
      code,
      clientId: FUB_CONFIG.clientId,
      clientSecret: FUB_CONFIG.clientSecret,
      redirectUri,
    })

    const expiresAt = computeExpiresAt(tokens.expires_in, tokens.created_at)

    // Verify the token by calling FUB /v1/me
    const meRes = await fetch(`${FUB_CONFIG.apiBase}/me`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    })

    if (!meRes.ok) {
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=verify_failed', request.url))
    }

    // Set a secure httpOnly cookie with the token data for the settings page to consume
    const response = NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_connected=fub', request.url))

    response.cookies.set('fub_oauth_token', JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes — just enough for the settings page to pick it up
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[FUB OAuth] Callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=unknown', request.url))
  }
}
