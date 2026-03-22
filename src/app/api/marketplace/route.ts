import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenPosts, getPostsByAgent } from '@/data/referral-posts'

// ── GET — fetch marketplace posts ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const market = searchParams.get('market')
    const status = searchParams.get('status') || 'open'

    const supabase = createAdminClient()

    let query = supabase
      .from('ar_marketplace_posts')
      .select(`
        *,
        posting_agent:ar_profiles!posting_agent_id (
          id, full_name, email, primary_area, color,
          brokerage:ar_brokerages ( name )
        )
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (agentId) query = query.eq('posting_agent_id', agentId)
    if (market) query = query.ilike('market', `%${market}%`)

    const { data, error } = await query

    if (error) {
      console.error('[Marketplace] GET DB error, falling back to mock:', error.message)
      const posts = agentId ? getPostsByAgent(agentId) : getOpenPosts()
      return NextResponse.json({ success: true, posts, source: 'mock' })
    }

    return NextResponse.json({ success: true, posts: data, source: 'supabase' })
  } catch (error) {
    console.error('[Marketplace] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — create a new marketplace post ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      postingAgentId,
      clientInitials,
      representation,
      budgetRange,
      estimatedPrice,
      timeline,
      market,
      neighborhood,
      feePercent,
      commissionRate,
      description,
      clientNeeds,
      decisionDeadline,
      expiresAt,
    } = body

    if (!postingAgentId || !market || !description) {
      return NextResponse.json({ error: 'Missing required fields: postingAgentId, market, and description are required' }, { status: 400 })
    }

    // Default decisionDeadline to 14 days from now if not provided
    const effectiveDeadline = decisionDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_marketplace_posts')
      .insert({
        posting_agent_id: postingAgentId,
        client_initials: clientInitials || '??',
        representation: representation || 'Buyer',
        budget_range: budgetRange || '',
        estimated_price: estimatedPrice || null,
        timeline: timeline || null,
        market,
        neighborhood: neighborhood || null,
        fee_percent: feePercent || 25,
        commission_rate: commissionRate || 3,
        description,
        client_needs: clientNeeds || [],
        decision_deadline: effectiveDeadline,
        expires_at: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        // early_access_until is auto-set by trigger
      })
      .select()
      .single()

    if (error) {
      console.error('[Marketplace] POST error:', error.message, error.details, error.hint)
      // FK violation = user doesn't have a profile in ar_profiles
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Your profile is not fully set up. Please complete onboarding first.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also create a pipeline referral entry so it shows in the user's pipeline
    const { error: refError } = await supabase
      .from('ar_referrals')
      .insert({
        client_name: clientInitials || 'Marketplace Referral',
        from_agent_id: postingAgentId,
        to_agent_id: null, // assigned when a bid is awarded
        market,
        fee_percent: feePercent || 25,
        estimated_price: estimatedPrice || null,
        est_close_date: effectiveDeadline,
        stage: 'agreement_sent',
        notes: `Marketplace post: ${description}`,
      })

    if (refError) {
      console.error('[Marketplace] Pipeline referral insert failed (non-blocking):', refError.message)
      // Don't fail the whole request — the marketplace post was created successfully
    }

    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    console.error('[Marketplace] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update post status (award, cancel, expire) ──
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, status, awardedBidId } = body

    if (!postId || !status) {
      return NextResponse.json({ error: 'Missing postId or status' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = { status }
    if (awardedBidId) updateData.awarded_bid_id = awardedBidId

    const { data, error } = await supabase
      .from('ar_marketplace_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (error) {
      console.error('[Marketplace] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If awarding, update the bid status too
    if (status === 'awarded' && awardedBidId) {
      await supabase
        .from('ar_marketplace_bids')
        .update({ status: 'accepted', response_at: new Date().toISOString() })
        .eq('id', awardedBidId)

      // Decline all other bids
      await supabase
        .from('ar_marketplace_bids')
        .update({ status: 'declined', response_at: new Date().toISOString() })
        .eq('post_id', postId)
        .neq('id', awardedBidId)
        .eq('status', 'pending')
    }

    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    console.error('[Marketplace] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
