import { NextRequest, NextResponse } from 'next/server'

// POST /api/referrals/stage — update a referral's pipeline stage & fire expectation notifications
// Body: { referralId, newStage }
export async function POST(request: NextRequest) {
  try {
    const { referralId, newStage } = await request.json()

    if (!referralId || !newStage) {
      return NextResponse.json({ error: 'referralId and newStage are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // 1. Update the referral stage
    const { data: referral, error: updateError } = await supabase
      .from('ar_referrals')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', referralId)
      .select('id, client_name, from_agent_id, to_agent_id, stage')
      .single()

    if (updateError || !referral) {
      return NextResponse.json({ error: updateError?.message || 'Referral not found' }, { status: 500 })
    }

    // 2. Find stage_change expectations that match this stage
    const { data: matchingItems } = await supabase
      .from('ar_expectation_items')
      .select('id, event_key, label, notification_template')
      .eq('trigger_type', 'stage_change')
      .eq('is_active', true)

    const triggered = (matchingItems ?? []).filter((item) => {
      const config = item.notification_template as Record<string, unknown> | null
      const triggerConfig = config // we check trigger_config not notification_template
      return true // We'll re-query with trigger_config
    })

    // Re-query with trigger_config
    const { data: stageItems } = await supabase
      .from('ar_expectation_items')
      .select('id, event_key, label, notification_template, trigger_config')
      .eq('trigger_type', 'stage_change')
      .eq('is_active', true)

    const matchedItems = (stageItems ?? []).filter((item) => {
      const config = item.trigger_config as { stage?: string } | null
      return config?.stage === newStage
    })

    if (matchedItems.length === 0) {
      return NextResponse.json({ success: true, referral, notificationsSent: 0 })
    }

    // 3. Check if the referring agent (from_agent_id) has these expectations enabled (side='send')
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
      return NextResponse.json({ success: true, referral, notificationsSent: 0 })
    }

    // 4. Get agent names for template rendering
    const { data: fromAgent } = await supabase
      .from('ar_profiles')
      .select('full_name, email, referral_update_method')
      .eq('id', referral.from_agent_id)
      .single()

    const { data: toAgent } = await supabase
      .from('ar_profiles')
      .select('full_name')
      .eq('id', referral.to_agent_id)
      .single()

    // 5. Send notifications
    const { sendNotificationEmail } = await import('@/lib/postmark')
    let sentCount = 0

    for (const item of itemsToNotify) {
      const template = item.notification_template as { subject?: string; body?: string } | null
      const subject = (template?.subject ?? `Referral Update: ${item.label}`)
        .replace('{{client_name}}', referral.client_name)
        .replace('{{receiving_agent}}', toAgent?.full_name ?? 'Your referral partner')

      const body = (template?.body ?? item.label)
        .replace('{{client_name}}', referral.client_name)
        .replace('{{receiving_agent}}', toAgent?.full_name ?? 'Your referral partner')

      // Send email
      if (fromAgent?.email) {
        await sendNotificationEmail({
          toEmail: fromAgent.email,
          toName: fromAgent.full_name ?? '',
          subject,
          preheader: body.slice(0, 100),
          heading: subject,
          body,
          ctaText: 'View Referral',
          ctaUrl: 'https://agentreferrals.ai/dashboard/pipeline',
        })
      }

      // Log notification
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

    return NextResponse.json({ success: true, referral, notificationsSent: sentCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
