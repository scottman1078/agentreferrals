import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentInterviews, getPublicInterviews } from '@/data/video-intros'

// ── GET — fetch zoom interviews for an agent ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const publicOnly = searchParams.get('public') === 'true'

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('ar_zoom_interviews')
      .select(`
        *,
        requester:ar_profiles!requester_id ( id, full_name, color, brokerage:ar_brokerages ( name ) ),
        interviewee:ar_profiles!interviewee_id ( id, full_name, color, brokerage:ar_brokerages ( name ) )
      `)
      .or(`requester_id.eq.${agentId},interviewee_id.eq.${agentId}`)
      .order('created_at', { ascending: false })

    if (publicOnly) {
      query = query.eq('status', 'completed').eq('is_public', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ZoomInterviews] GET DB error, falling back to mock:', error.message)
      const interviews = publicOnly ? getPublicInterviews(agentId) : getAgentInterviews(agentId)
      return NextResponse.json({ success: true, interviews, source: 'mock' })
    }

    return NextResponse.json({ success: true, interviews: data, source: 'supabase' })
  } catch (error) {
    console.error('[ZoomInterviews] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — request a zoom interview ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requesterId, intervieweeId, message } = body

    if (!requesterId || !intervieweeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (requesterId === intervieweeId) {
      return NextResponse.json({ error: 'Cannot interview yourself' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_zoom_interviews')
      .insert({
        requester_id: requesterId,
        interviewee_id: intervieweeId,
        notes: message || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[ZoomInterviews] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, interview: data })
  } catch (error) {
    console.error('[ZoomInterviews] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update interview (schedule, complete, make public) ──
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { interviewId, status, scheduledAt, zoomLink, recordingUrl, isPublic, duration, notes } = body

    if (!interviewId) {
      return NextResponse.json({ error: 'Missing interviewId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (scheduledAt) updateData.scheduled_at = scheduledAt
    if (zoomLink) updateData.zoom_link = zoomLink
    if (recordingUrl) updateData.recording_url = recordingUrl
    if (typeof isPublic === 'boolean') updateData.is_public = isPublic
    if (duration) updateData.duration = duration
    if (notes) updateData.notes = notes
    if (status === 'completed') updateData.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('ar_zoom_interviews')
      .update(updateData)
      .eq('id', interviewId)
      .select()
      .single()

    if (error) {
      console.error('[ZoomInterviews] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, interview: data })
  } catch (error) {
    console.error('[ZoomInterviews] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
