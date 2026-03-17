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

    // Use Hub admin API to manage the user and generate a session
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL!
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY!
    const hubAdmin = createClient(hubUrl, hubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up or create the user
    const { data: listData } = await hubAdmin.auth.admin.listUsers()
    let user = listData?.users?.find((u) => u.email === email)

    if (!user) {
      // Create the user if they don't exist
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

    // Generate a magic link and extract the OTP token from it
    const { data: linkData, error: linkError } = await hubAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData) {
      console.error('[MagicLink Verify] Failed to generate link:', linkError)
      return NextResponse.json({ valid: false, error: 'Failed to generate session' }, { status: 500 })
    }

    // Extract the hashed_token from the generated link properties
    // The client will use verifyOtp with this token to establish a session
    const hashedToken = linkData.properties?.hashed_token
    const actionLink = linkData.properties?.action_link

    if (!hashedToken) {
      console.error('[MagicLink Verify] No hashed_token in link data')
      return NextResponse.json({ valid: false, error: 'Failed to generate session token' }, { status: 500 })
    }

    return NextResponse.json({
      valid: true,
      email,
      hashedToken,
      actionLink,
    })
  } catch (error) {
    console.error('[MagicLink Verify] Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
