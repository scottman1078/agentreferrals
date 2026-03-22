import { NextRequest, NextResponse } from 'next/server'

// GET /api/crm/fub/callback — OAuth callback from Follow Up Boss
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=auth_denied', request.url))
  }

  try {
    const clientId = process.env.FUB_CLIENT_ID || process.env.NEXT_PUBLIC_FUB_CLIENT_ID || ''
    const clientSecret = process.env.FUB_CLIENT_SECRET || ''
    const redirectUri = `${request.nextUrl.origin}/api/crm/fub/callback`

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://app.followupboss.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}))
      console.error('[FUB OAuth] Token exchange failed:', errData)
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=token_failed', request.url))
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Store the connection in Supabase
    // We need the user's ID — get it from the session cookie
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Verify the token by calling FUB /v1/me
    const meRes = await fetch('https://api.followupboss.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    })

    if (!meRes.ok) {
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_error=verify_failed', request.url))
    }

    const meData = await meRes.json()

    // Store token — we'll associate it with the user via a temp cookie or query param
    // For now, store as a pending connection that the settings page will pick up
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Store in a temporary table or use the connection directly
    // The user will be identified when the settings page loads and calls the API
    const response = NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&crm_connected=fub', request.url))

    // Set a secure httpOnly cookie with the token data for the settings page to consume
    response.cookies.set('fub_oauth_token', JSON.stringify({
      access_token,
      refresh_token,
      expires_at: tokenExpiresAt,
      fub_user: meData.name || meData.email || 'FUB User',
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
