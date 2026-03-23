import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'
import { exchangeLoftyCodeForTokens, computeExpiresAt, getCallbackUrl, LOFTY_CONFIG } from '@/lib/integration-utils'

// GET /api/crm/lofty/callback — OAuth callback from Lofty
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    console.error('[Lofty OAuth] Auth denied or no code received. Error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&crm_error=auth_denied', request.url)
    )
  }

  try {
    // Verify user is authenticated
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&crm_error=not_authenticated', request.url)
      )
    }

    const redirectUri = getCallbackUrl('lofty')

    // Exchange authorization code for tokens
    const tokens = await exchangeLoftyCodeForTokens({
      code,
      redirectUri,
    })

    const expiresAt = computeExpiresAt(tokens.expires_in, tokens.created_at)

    // Verify the token by calling the Lofty API
    const verifyRes = await fetch(`${LOFTY_CONFIG.apiBase}/org`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    let orgMetadata: Record<string, unknown> = {}
    if (!verifyRes.ok) {
      console.error('[Lofty OAuth] Token verification failed:', verifyRes.status)
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&crm_error=verify_failed', request.url)
      )
    }

    const orgData = await verifyRes.json()
    orgMetadata = { orgName: orgData.name, orgId: orgData.id }

    // Save connection with OAuth tokens to database
    const admin = createAdminClient()
    const { error: upsertError } = await admin
      .from('ar_crm_connections')
      .upsert(
        {
          agent_id: user.id,
          provider: 'lofty',
          status: 'connected',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          metadata: {
            ...orgMetadata,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            token_type: tokens.token_type || 'Bearer',
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,provider' }
      )

    if (upsertError) {
      console.error('[Lofty OAuth] Failed to save connection:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&crm_error=save_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&crm_connected=lofty', request.url)
    )
  } catch (err) {
    console.error('[Lofty OAuth] Callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&crm_error=unknown', request.url)
    )
  }
}
