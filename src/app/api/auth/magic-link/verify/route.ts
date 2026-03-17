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

    // Use Hub admin API to manage the user and generate a session link
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL!
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY!
    const hubAdmin = createClient(hubUrl, hubKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Look up or create the user
    const { data: listData } = await hubAdmin.auth.admin.listUsers()
    const existingUser = listData?.users?.find((u) => u.email === email)

    if (!existingUser) {
      // Create the user if they don't exist
      const { error: createError } = await hubAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createError) {
        console.error('[MagicLink Verify] Failed to create user:', createError)
        return NextResponse.json({ valid: false, error: 'Failed to create account' }, { status: 500 })
      }
    }

    // Generate a magic link URL that Supabase can use to create a session
    const isDev = process.env.NODE_ENV === 'development'
    const redirectTo = isDev
      ? 'http://localhost:5500/auth/callback'
      : 'https://agentreferrals.ai/auth/callback'

    const { data: linkData, error: linkError } = await hubAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    })

    if (linkError || !linkData) {
      console.error('[MagicLink Verify] Failed to generate Supabase link:', linkError)
      return NextResponse.json({ valid: false, error: 'Failed to generate session' }, { status: 500 })
    }

    return NextResponse.json({
      valid: true,
      actionLink: linkData?.properties?.action_link,
    })
  } catch (error) {
    console.error('[MagicLink Verify] Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
