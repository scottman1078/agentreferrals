import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyChallenge } from '../route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { challenge, code, password } = body

    if (!challenge || !code || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Verify the code against the HMAC challenge
    const result = verifyChallenge(challenge, code.toString().trim())
    if (!result.valid || !result.email) {
      return NextResponse.json({ success: false, error: result.error || 'Invalid code' }, { status: 400 })
    }

    // Update the user's password via Hub admin client
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY

    if (!hubUrl || !hubKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const hub = createClient(hubUrl, hubKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Find the user by email
    const { data: { users }, error: listError } = await hub.auth.admin.listUsers()
    const user = listError ? null : users.find(u => u.email === result.email)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await hub.auth.admin.updateUserById(user.id, { password })

    if (updateError) {
      console.error('[PasswordReset] Password update failed:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PasswordReset] Verify error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
