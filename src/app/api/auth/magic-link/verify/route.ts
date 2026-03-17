import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

    // Strategy: Set a temporary password, sign in with it, then clear it
    // This creates a real session with access_token and refresh_token
    const tempPassword = crypto.randomBytes(32).toString('hex')

    // Set temporary password
    const { error: updateError } = await hubAdmin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
    })

    if (updateError) {
      console.error('[MagicLink Verify] Failed to set temp password:', updateError)
      return NextResponse.json({ valid: false, error: 'Failed to create session' }, { status: 500 })
    }

    // Sign in with the temporary password to get session tokens
    const { data: signInData, error: signInError } = await hubAdmin.auth.signInWithPassword({
      email,
      password: tempPassword,
    })

    // Immediately clear the temporary password by setting a new random one
    // (so the temp password can never be reused)
    await hubAdmin.auth.admin.updateUserById(user.id, {
      password: crypto.randomBytes(32).toString('hex'),
    })

    if (signInError || !signInData.session) {
      console.error('[MagicLink Verify] Temp sign-in failed:', signInError)
      return NextResponse.json({ valid: false, error: 'Failed to create session' }, { status: 500 })
    }

    // Return the session tokens — the client will use setSession() to establish it
    return NextResponse.json({
      valid: true,
      email,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      user: {
        id: signInData.session.user.id,
        email: signInData.session.user.email,
      },
    })
  } catch (error) {
    console.error('[MagicLink Verify] Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
