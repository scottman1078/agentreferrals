import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/postmark'

export async function POST(request: NextRequest) {
  try {
    const { email, name, referralCode } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const result = await sendWelcomeEmail({
      toEmail: email,
      toName: name || email.split('@')[0],
      referralCode: referralCode || 'WELCOME',
    })

    return NextResponse.json({ success: result.success })
  } catch (error) {
    console.error('[Welcome] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
