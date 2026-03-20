import { NextRequest, NextResponse } from 'next/server'

// GET /api/referrals/activity?referralId=xxx — get activity log for a referral
export async function GET(request: NextRequest) {
  try {
    const referralId = request.nextUrl.searchParams.get('referralId')
    if (!referralId) {
      return NextResponse.json({ error: 'referralId required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_referral_activities')
      .select('*')
      .eq('referral_id', referralId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/referrals/activity — log an activity & fire expectation notifications
// Body: { referralId, loggedBy, activityType, title, notes? }
export async function POST(request: NextRequest) {
  try {
    const { referralId, loggedBy, activityType, title, notes } = await request.json()

    if (!referralId || !loggedBy || !activityType || !title) {
      return NextResponse.json({ error: 'referralId, loggedBy, activityType, and title are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // 1. Insert activity
    const { data: activity, error: insertError } = await supabase
      .from('ar_referral_activities')
      .insert({
        referral_id: referralId,
        logged_by: loggedBy,
        activity_type: activityType,
        title,
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 2. Get the referral to find the referring agent
    const { data: referral } = await supabase
      .from('ar_referrals')
      .select('id, client_name, from_agent_id, to_agent_id')
      .eq('id', referralId)
      .single()

    if (!referral) {
      return NextResponse.json({ success: true, activity, notificationsSent: 0 })
    }

    // 3. Find activity-based expectations matching this activity_type
    const { data: matchingItems } = await supabase
      .from('ar_expectation_items')
      .select('id, event_key, label, notification_template, trigger_config')
      .eq('trigger_type', 'activity')
      .eq('is_active', true)

    const matchedItems = (matchingItems ?? []).filter((item) => {
      const config = item.trigger_config as { activity_type?: string } | null
      return config?.activity_type === activityType
    })

    if (matchedItems.length === 0) {
      return NextResponse.json({ success: true, activity, notificationsSent: 0 })
    }

    // 4. Check if referring agent has these expectations enabled
    const matchedIds = matchedItems.map((i) => i.id)

    const { data: agentExpectations } = await supabase
      .from('ar_profile_expectations')
      .select('expectation_id')
      .eq('agent_id', referral.from_agent_id)
      .eq('side', 'send')
      .in('expectation_id', matchedIds)

    const enabledIds = new Set((agentExpectations ?? []).map((e) => e.expectation_id))
    const itemsToNotify = matchedItems.filter((i) => enabledIds.has(i.id))

    if (itemsToNotify.length === 0) {
      return NextResponse.json({ success: true, activity, notificationsSent: 0 })
    }

    // 5. Get agent info and send notifications
    const { data: fromAgent } = await supabase
      .from('ar_profiles')
      .select('full_name, email')
      .eq('id', referral.from_agent_id)
      .single()

    const { data: toAgent } = await supabase
      .from('ar_profiles')
      .select('full_name')
      .eq('id', referral.to_agent_id)
      .single()

    const { sendNotificationEmail } = await import('@/lib/postmark')
    let sentCount = 0

    for (const item of itemsToNotify) {
      const template = item.notification_template as { subject?: string; body?: string } | null
      const subject = (template?.subject ?? `Referral Update: ${item.label}`)
        .replace('{{client_name}}', referral.client_name)
        .replace('{{receiving_agent}}', toAgent?.full_name ?? 'Your referral partner')

      const bodyText = (template?.body ?? item.label)
        .replace('{{client_name}}', referral.client_name)
        .replace('{{receiving_agent}}', toAgent?.full_name ?? 'Your referral partner')

      // Append activity notes if provided
      const fullBody = notes
        ? `${bodyText}\n\nUpdate from ${toAgent?.full_name ?? 'agent'}:\n"${notes}"`
        : bodyText

      if (fromAgent?.email) {
        await sendNotificationEmail({
          toEmail: fromAgent.email,
          toName: fromAgent.full_name ?? '',
          subject,
          preheader: fullBody.slice(0, 100),
          heading: subject,
          body: fullBody,
          ctaText: 'View Referral',
          ctaUrl: 'https://agentreferrals.ai/dashboard/pipeline',
        })
      }

      await supabase.from('ar_referral_notifications').insert({
        referral_id: referralId,
        expectation_id: item.id,
        sent_to: referral.from_agent_id,
        channel: 'email',
        subject,
        status: 'sent',
      })

      sentCount++
    }

    return NextResponse.json({ success: true, activity, notificationsSent: sentCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
