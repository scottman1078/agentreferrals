import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID!

export async function sendVerificationCode(phone: string) {
  try {
    const verification = await client.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: phone, channel: 'sms' })
    return { status: verification.status, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send verification code'
    console.error('[Twilio] sendVerificationCode error:', message)
    return { status: 'failed' as const, error: message }
  }
}

export async function checkVerificationCode(phone: string, code: string) {
  try {
    const check = await client.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: phone, code })
    return { status: check.status, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check verification code'
    console.error('[Twilio] checkVerificationCode error:', message)
    return { status: 'failed' as const, error: message }
  }
}
