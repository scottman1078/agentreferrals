import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, phase } = body

    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL!
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY!
    const hubAdmin = createClient(hubUrl, hubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Phase 2: Client has signed in — rotate the temp password
    if (phase === 'cleanup') {
      const { userId } = body
      if (userId) {
        await hubAdmin.auth.admin.updateUserById(userId, {
          password: crypto.randomBytes(32).toString('hex'),
        })
      }
      return NextResponse.json({ success: true })
    }

    // Phase 1: Verify token and set temp password
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

    // Set a temporary password — client will use this to sign in directly
    const tempPassword = crypto.randomBytes(32).toString('hex')

    const { error: updateError } = await hubAdmin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
    })

    if (updateError) {
      console.error('[MagicLink Verify] Failed to set temp password:', updateError)
      return NextResponse.json({ valid: false, error: 'Failed to prepare sign-in' }, { status: 500 })
    }

    // Return the email, temp password, and user ID
    // The client will sign in directly, then call phase=cleanup to rotate the password
    return NextResponse.json({
      valid: true,
      email,
      tempKey: tempPassword,
      userId: user.id,
    })
  } catch (error) {
    console.error('[MagicLink Verify] Unexpected error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
