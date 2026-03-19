import { NextRequest, NextResponse } from 'next/server'

const MAX_EMAILS_PER_REQUEST = 50

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/invites/bulk
// Bulk-send invite emails (for CSV/paste import)
export async function POST(request: NextRequest) {
  try {
    const { userId, userName, emails } = await request.json()

    if (!userId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, emails[]' },
        { status: 400 }
      )
    }

    if (emails.length > MAX_EMAILS_PER_REQUEST) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_EMAILS_PER_REQUEST} emails per request` },
        { status: 400 }
      )
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { sendInviteEmail } = await import('@/lib/postmark')
    const supabase = createAdminClient()

    // Get user's profile for invite context
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('full_name, primary_area, brokerage_id')
      .eq('id', userId)
      .single()

    const inviterName = profile?.full_name || userName || 'An AgentReferrals member'
    const inviterArea = profile?.primary_area || ''

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

    // Validate and deduplicate emails
    const uniqueEmails = [...new Set(
      emails
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e && EMAIL_REGEX.test(e))
    )]

    // Check which emails are already invited by this user
    const { data: existingInvites } = await supabase
      .from('ar_invites')
      .select('invitee_email')
      .eq('invited_by', userId)
      .in('invitee_email', uniqueEmails)

    const alreadyInvited = new Set(
      (existingInvites || []).map((inv: { invitee_email: string }) => inv.invitee_email)
    )

    let sent = 0
    let skipped = 0
    let errors = 0

    for (const email of uniqueEmails) {
      // Skip already-invited emails
      if (alreadyInvited.has(email)) {
        skipped++
        continue
      }

      // Generate invite code
      const firstName = inviterName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'AR'
      const code = `${firstName}-${Date.now().toString(36).toUpperCase()}`

      // Create ar_invites record
      const { error: insertError } = await supabase.from('ar_invites').insert({
        invited_by: userId,
        invitee_email: email,
        referral_code: code,
        method: 'email',
        status: 'pending',
      })

      if (insertError) {
        console.error(`[invites/bulk] Insert error for ${email}:`, insertError.message)
        errors++
        continue
      }

      // Send email via Postmark
      const isDev = process.env.NODE_ENV === 'development'
      const baseUrl = isDev ? 'http://localhost:5500' : 'https://agentreferrals.ai'
      const referralLink = `${baseUrl}/?invite=${code}`

      try {
        await sendInviteEmail({
          toEmail: email,
          toName: email.split('@')[0],
          inviterName,
          inviterBrokerage: brokerageName,
          inviterArea,
          referralLink,
        })
        sent++
      } catch (emailErr) {
        console.error(`[invites/bulk] Email error for ${email}:`, emailErr)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors,
      total: uniqueEmails.length,
    })
  } catch (error) {
    console.error('[invites/bulk] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
