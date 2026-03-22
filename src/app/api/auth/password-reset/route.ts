import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail } from '@/lib/postmark'

const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || process.env.HUB_SERVICE_ROLE_KEY || 'fallback-secret'
const CODE_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

function signChallenge(email: string, code: string, expiresAt: number): string {
  const payload = `${email}:${code}:${expiresAt}`
  const hmac = crypto.createHmac('sha256', RESET_SECRET).update(payload).digest('hex')
  // challenge = base64(email:expiresAt:hmac)  — code is NOT included
  return Buffer.from(`${email}:${expiresAt}:${hmac}`).toString('base64url')
}

export function verifyChallenge(challenge: string, code: string): { valid: boolean; email?: string; error?: string } {
  try {
    const decoded = Buffer.from(challenge, 'base64url').toString()
    const [email, expiresAtStr, hmac] = decoded.split(':')
    const expiresAt = parseInt(expiresAtStr, 10)

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Code has expired' }
    }

    const expectedPayload = `${email}:${code}:${expiresAt}`
    const expectedHmac = crypto.createHmac('sha256', RESET_SECRET).update(expectedPayload).digest('hex')

    if (hmac !== expectedHmac) {
      return { valid: false, error: 'Invalid code' }
    }

    return { valid: true, email }
  } catch {
    return { valid: false, error: 'Invalid reset request' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if user exists in Hub
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
    const hubKey = process.env.HUB_SERVICE_ROLE_KEY
    let firstName = 'there'
    let userExists = false

    if (hubUrl && hubKey) {
      try {
        const hub = createClient(hubUrl, hubKey, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data: profile } = await hub
          .from('profiles')
          .select('full_name')
          .eq('email', normalizedEmail)
          .single()
        if (profile) {
          userExists = true
          if (profile.full_name) {
            firstName = profile.full_name.split(' ')[0]
          }
        }
      } catch {
        // Not found
      }
    }

    // Always return success to prevent email enumeration
    if (!userExists) {
      return NextResponse.json({ success: true, challenge: '' })
    }

    const code = generateCode()
    const expiresAt = Date.now() + CODE_EXPIRY_MS
    const challenge = signChallenge(normalizedEmail, code, expiresAt)

    // Send code via Postmark
    const emailResult = await sendPasswordResetEmail({
      toEmail: normalizedEmail,
      firstName,
      code,
    })

    if (!emailResult.success) {
      console.error('[PasswordReset] Email send failed:', emailResult)
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, challenge })
  } catch (error) {
    console.error('[PasswordReset] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
