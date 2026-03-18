import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendConfirmEmail } from '@/lib/postmark'

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const token = crypto.randomBytes(32).toString('hex')

    // Store in ar_magic_links with 24-hour expiry (reuse the same table)
    const supabase = createAdminClient()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('ar_magic_links')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      })

    if (dbError) {
      console.error('[ConfirmEmail] DB insert failed:', dbError)
      return NextResponse.json({ success: false, error: 'Failed to create confirmation link' }, { status: 500 })
    }

    // Build confirmation URL
    const isDev = process.env.NODE_ENV === 'development'
    const baseUrl = isDev ? 'http://localhost:5500' : 'https://agentreferrals.ai'
    const confirmUrl = `${baseUrl}/auth/confirm?token=${token}`

    // Send branded email via Postmark
    const emailResult = await sendConfirmEmail({
      toEmail: normalizedEmail,
      firstName: firstName || 'there',
      confirmUrl,
    })

    if (!emailResult.success) {
      console.error('[ConfirmEmail] Email send failed:', emailResult)
      return NextResponse.json({ success: false, error: 'Failed to send confirmation email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ConfirmEmail] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
