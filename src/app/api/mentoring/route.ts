import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_mentorships')
      .select('*')
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Mentoring GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mentorships: data })
  } catch (error) {
    console.error('[Mentoring GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mentorId, menteeId, specialization, message } = body

    if (!mentorId || !menteeId) {
      return NextResponse.json({ error: 'mentorId and menteeId are required' }, { status: 400 })
    }

    if (mentorId === menteeId) {
      return NextResponse.json({ error: 'Cannot mentor yourself' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_mentorships')
      .insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
        specialization: specialization || null,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Mentorship request already exists' }, { status: 409 })
      }
      console.error('[Mentoring POST] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mentorship: data }, { status: 201 })
  } catch (error) {
    console.error('[Mentoring POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, userId } = body

    if (!id || !status || !userId) {
      return NextResponse.json({ error: 'id, status, and userId are required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'active', 'declined', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the user is the mentor (only mentors can accept/decline)
    const { data: existing, error: fetchError } = await supabase
      .from('ar_mentorships')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Mentorship not found' }, { status: 404 })
    }

    if (existing.mentor_id !== userId && existing.mentee_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'active') {
      updates.started_at = new Date().toISOString()
    }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ar_mentorships')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Mentoring PATCH] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mentorship: data })
  } catch (error) {
    console.error('[Mentoring PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
