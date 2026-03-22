import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/referrals — create a new referral
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromAgentId,
      toAgentId,
      clientName,
      clientEmail,
      clientPhone,
      representation,
      budget,
      notes,
      market,
      feePercent,
      estimatedPrice,
      commissionRate,
      estCloseDate,
      agreementExpDays,
      personalNote,
    } = body

    if (!fromAgentId || !clientName) {
      return NextResponse.json({ error: 'fromAgentId and clientName are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Build the core insert object with known ar_referrals columns
    const insertData: Record<string, unknown> = {
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId || null,
      client_name: clientName,
      market: market || null,
      fee_percent: feePercent || 25,
      estimated_price: estimatedPrice || null,
      estimated_close_date: estCloseDate || null,
      notes: [notes, personalNote].filter(Boolean).join('\n') || null,
      stage: 'Agreement Sent',
    }

    // Include optional columns if they exist in the table (gracefully ignored if not)
    if (clientEmail) insertData.client_email = clientEmail
    if (clientPhone) insertData.client_phone = clientPhone
    if (representation) insertData.representation = representation
    if (budget) insertData.budget = budget
    if (commissionRate) insertData.commission_rate = commissionRate
    if (agreementExpDays) insertData.agreement_exp_days = agreementExpDays

    const { data, error } = await supabase
      .from('ar_referrals')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // If insert fails due to unknown columns, retry with only core columns
      if (error.message?.includes('column') || error.code === '42703') {
        const coreData = {
          from_agent_id: fromAgentId,
          to_agent_id: toAgentId || null,
          client_name: clientName,
          market: market || null,
          fee_percent: feePercent || 25,
          estimated_price: estimatedPrice || null,
          estimated_close_date: estCloseDate || null,
          notes: [notes, personalNote, clientEmail, clientPhone, representation, budget]
            .filter(Boolean).join(' | ') || null,
          stage: 'Agreement Sent',
        }

        const { data: retryData, error: retryError } = await supabase
          .from('ar_referrals')
          .insert(coreData)
          .select()
          .single()

        if (retryError) {
          console.error('[Referrals] POST retry error:', retryError)
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, referral: retryData })
      }

      console.error('[Referrals] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, referral: data })
  } catch (error) {
    console.error('[Referrals] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
