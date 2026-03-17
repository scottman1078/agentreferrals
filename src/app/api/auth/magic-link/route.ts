import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { sendMagicLinkEmail } from '@/lib/postmark'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Generate secure token (64 hex chars)
    const token = crypto.randomBytes(32).toString('hex')

    // Store in ar_magic_links with 15-minute expiry
    const supabase = createAdminClient()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('ar_magic_links')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      })

    if (dbError) {
      console.error('[MagicLink] DB insert failed:', dbError)
      return NextResponse.json({ success: false, error: 'Failed to create magic link' }, { status: 500 })
    }

    // Try to look up name from Hub profiles
    let firstName = 'there'
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY
    if (hubUrl && hubKey) {
      try {
        const hub = createClient(hubUrl, hubKey, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data: profile } = await hub
          .from('profiles')
          .select('full_name')
          .eq('email', normalizedEmail)
          .single()
        if (profile?.full_name) {
          firstName = profile.full_name.split(' ')[0]
        }
      } catch {
        // Not critical — use default greeting
      }
    }

    // Build magic link URL
    const isDev = process.env.NODE_ENV === 'development'
    const baseUrl = isDev ? 'http://localhost:5500' : 'https://agentreferrals.ai'
    const magicUrl = `${baseUrl}/auth/magic?token=${token}`

    // Send branded email via Postmark
    const emailResult = await sendMagicLinkEmail({
      toEmail: normalizedEmail,
      firstName,
      magicUrl,
    })

    if (!emailResult.success) {
      console.error('[MagicLink] Email send failed:', emailResult)
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MagicLink] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
