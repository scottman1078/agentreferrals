import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('ar_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { user, admin }
}

// GET /api/admin/announcements — list all announcements
export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await auth.admin
      .from('ar_announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Announcements] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ announcements: data })
  } catch (error) {
    console.error('[Admin Announcements] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/announcements — create announcement
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, content, type, target_tier, target_page, starts_at, ends_at, is_active } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
    }

    const { data, error } = await auth.admin
      .from('ar_announcements')
      .insert({
        title,
        content,
        type: type || 'banner',
        target_tier: target_tier || null,
        target_page: target_page || null,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Announcements] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, announcement: data })
  } catch (error) {
    console.error('[Admin Announcements] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/announcements — update announcement
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await auth.admin
      .from('ar_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Announcements] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, announcement: data })
  } catch (error) {
    console.error('[Admin Announcements] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/announcements — delete announcement
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await auth.admin
      .from('ar_announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Admin Announcements] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Announcements] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
