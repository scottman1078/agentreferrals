import { NextRequest, NextResponse } from 'next/server'

// POST /api/onboarding-invites
// Sends invite emails during onboarding and creates ar_invites records
// Uses the inviter's profile referral_code (not individual codes)
export async function POST(request: NextRequest) {
  try {
    const { userId, userName, emails } = await request.json()

    if (!userId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { sendInviteEmail } = await import('@/lib/postmark')
    const supabase = createAdminClient()

    // Get user's profile for invite context and referral_code
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('full_name, primary_area, brokerage_id, referral_code')
      .eq('id', userId)
      .single()

    const inviterName = profile?.full_name || userName || 'An AgentReferrals member'
    const inviterArea = profile?.primary_area || ''
    const referralCode = profile?.referral_code || null

    // Get brokerage name
    let brokerageName = 'AgentReferrals'
    if (profile?.brokerage_id) {
      const { data: brokerage } = await supabase
        .from('ar_brokerages')
        .select('name')
        .eq('id', profile.brokerage_id)
        .single()
      if (brokerage) brokerageName = brokerage.name
    }

    const results = []

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed || !trimmed.includes('@')) continue

      // Create ar_invites record using the profile's referral_code
      const { error: insertError } = await supabase.from('ar_invites').insert({
        invited_by: userId,
        invitee_email: trimmed,
        referral_code: referralCode,
        method: 'email',
        status: 'pending',
      })

      if (insertError) {
        console.error(`[onboarding-invites] Insert error for ${trimmed}:`, insertError.message)
        results.push({ email: trimmed, sent: false, error: insertError.message })
        continue
      }

      // Send email via Postmark
      const isDev = process.env.NODE_ENV === 'development'
      const baseUrl = isDev ? 'http://localhost:5500' : 'https://agentreferrals.ai'
      const referralLink = referralCode
        ? `${baseUrl}/invite/${referralCode}`
        : `${baseUrl}/`

      try {
        await sendInviteEmail({
          toEmail: trimmed,
          toName: trimmed.split('@')[0],
          inviterName,
          inviterBrokerage: brokerageName,
          inviterArea,
          referralLink,
        })
        results.push({ email: trimmed, sent: true })
      } catch (emailErr) {
        console.error(`[onboarding-invites] Email error for ${trimmed}:`, emailErr)
        results.push({ email: trimmed, sent: false, error: 'Email delivery failed' })
      }
    }

    const sentCount = results.filter(r => r.sent).length
    return NextResponse.json({ success: true, sent: sentCount, total: results.length, results })
  } catch (error) {
    console.error('[onboarding-invites] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
