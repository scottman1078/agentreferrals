import { NextRequest, NextResponse } from 'next/server'
import { checkVerificationCode } from '@/lib/twilio'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (phone.startsWith('+')) return phone
  return `+${digits}`
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { verified: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { verified: false, error: 'Verification code is required' },
        { status: 400 }
      )
    }

    const normalized = normalizePhone(phone)
    const { status, error } = await checkVerificationCode(normalized, code)

    if (error) {
      return NextResponse.json(
        { verified: false, error },
        { status: 500 }
      )
    }

    return NextResponse.json({ verified: status === 'approved', status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json(
      { verified: false, error: message },
      { status: 500 }
    )
  }
}
