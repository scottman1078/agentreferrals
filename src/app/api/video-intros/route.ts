import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVideoIntro } from '@/data/video-intros'

// ── GET — fetch video intro for an agent ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_video_intros')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error || !data) {
      // Fall back to mock
      const mock = getVideoIntro(agentId)
      return NextResponse.json({ success: true, videoIntro: mock, source: 'mock' })
    }

    return NextResponse.json({ success: true, videoIntro: data, source: 'supabase' })
  } catch (error) {
    console.error('[VideoIntros] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — create/update video intro ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, videoUrl, thumbnailUrl, duration, title } = body

    if (!agentId || !videoUrl || !duration || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_video_intros')
      .upsert({
        agent_id: agentId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        duration,
        title,
      }, { onConflict: 'agent_id' })
      .select()
      .single()

    if (error) {
      console.error('[VideoIntros] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, videoIntro: data })
  } catch (error) {
    console.error('[VideoIntros] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE — remove video intro ──
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_video_intros')
      .delete()
      .eq('agent_id', agentId)

    if (error) {
      console.error('[VideoIntros] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[VideoIntros] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
