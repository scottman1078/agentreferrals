import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBidsForPost, getBidsByAgent } from '@/data/referral-posts'

// ── GET — fetch bids for a post or by an agent ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const agentId = searchParams.get('agentId')

    if (!postId && !agentId) {
      return NextResponse.json({ error: 'Missing postId or agentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('ar_marketplace_bids')
      .select(`
        *,
        agent:ar_profiles!agent_id (
          id, full_name, email, primary_area, color, refernet_score,
          closed_referrals, response_time_minutes,
          brokerage:ar_brokerages ( name )
        )
      `)
      .order('created_at', { ascending: false })

    if (postId) query = query.eq('post_id', postId)
    if (agentId) query = query.eq('agent_id', agentId)

    const { data, error } = await query

    if (error) {
      console.error('[Bids] GET DB error, falling back to mock:', error.message)
      const bids = postId ? getBidsForPost(postId) : agentId ? getBidsByAgent(agentId) : []
      return NextResponse.json({ success: true, bids, source: 'mock' })
    }

    return NextResponse.json({ success: true, bids: data, source: 'supabase' })
  } catch (error) {
    console.error('[Bids] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — submit a bid on a marketplace post ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, agentId, pitch, videoUrl, videoDuration, highlights } = body

    if (!postId || !agentId || !pitch) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check post exists and is open
    const { data: post } = await supabase
      .from('ar_marketplace_posts')
      .select('id, status, posting_agent_id')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    if (post.status !== 'open') {
      return NextResponse.json({ error: 'Post is no longer accepting bids' }, { status: 400 })
    }
    if (post.posting_agent_id === agentId) {
      return NextResponse.json({ error: 'Cannot bid on your own post' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ar_marketplace_bids')
      .insert({
        post_id: postId,
        agent_id: agentId,
        pitch,
        video_url: videoUrl || null,
        video_duration: videoDuration || null,
        highlights: highlights || [],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You have already bid on this post' }, { status: 409 })
      }
      console.error('[Bids] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, bid: data })
  } catch (error) {
    console.error('[Bids] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
