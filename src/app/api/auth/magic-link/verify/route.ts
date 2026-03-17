import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the token — must be unused and not expired
    const { data: linkRecord, error: lookupError } = await supabase
      .from('ar_magic_links')
      .select('id, email, expires_at')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (lookupError || !linkRecord) {
      return NextResponse.json({ valid: false, error: 'Link expired or invalid' })
    }

    // Mark as used
    await supabase
      .from('ar_magic_links')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', linkRecord.id)

    const email = linkRecord.email

    // Use Hub admin API
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL!
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY!
    const hubAdmin = createClient(hubUrl, hubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up or create the user
    const { data: listData } = await hubAdmin.auth.admin.listUsers()
    let user = listData?.users?.find((u) => u.email === email)

    if (!user) {
      const { data: newUser, error: createError } = await hubAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createError || !newUser.user) {
        console.error('[MagicLink Verify] Failed to create user:', createError)
        return NextResponse.json({ valid: false, error: 'Failed to create account' }, { status: 500 })
      }
      user = newUser.user
    }

    // Generate a magic link with the correct redirect
    const isDev = process.env.NODE_ENV === 'development'
    const redirectTo = isDev
      ? 'http://localhost:5500/auth/callback'
      : 'https://agentreferrals.ai/auth/callback'

    const { data: linkData, error: linkError } = await hubAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (linkError || !linkData) {
      console.error('[MagicLink Verify] Failed to generate link:', linkError)
      return NextResponse.json({ valid: false, error: 'Failed to generate session' }, { status: 500 })
    }

    const hashedToken = linkData.properties?.hashed_token
    const actionLink = linkData.properties?.action_link

    // Rewrite the action link to use the correct domain
    // The default action link goes to the Hub's site URL, which may be wrong
    let fixedActionLink = actionLink
    if (actionLink) {
      try {
        const url = new URL(actionLink)
        // The action link is a Supabase auth endpoint — we need to keep it as-is
        // but fix the redirect_to parameter inside it
        const redirectParam = url.searchParams.get('redirect_to')
        if (redirectParam && !redirectParam.includes('agentreferrals.ai') && !redirectParam.includes('localhost')) {
          url.searchParams.set('redirect_to', redirectTo)
          fixedActionLink = url.toString()
        }
      } catch {
        // URL parse failed — use as-is
      }
    }

    return NextResponse.json({
      valid: true,
      email,
      hashedToken: hashedToken || null,
      actionLink: fixedActionLink || null,
    })
  } catch (error) {
    console.error('[MagicLink Verify] Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
