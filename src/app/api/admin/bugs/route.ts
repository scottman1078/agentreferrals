import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/bugs — list all bugs
export async function GET(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const status = request.nextUrl.searchParams.get('status')

    let query = supabase
      .from('ar_bugs')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bugs: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/bugs — create a bug
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, severity, category, reported_by, reported_by_email, screenshot_url, page_url } = body

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_bugs')
      .insert({
        title,
        description: description || null,
        severity: severity || 'medium',
        category: category || 'bug',
        reported_by: reported_by || null,
        reported_by_email: reported_by_email || null,
        screenshot_url: screenshot_url || null,
        page_url: page_url || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bug: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/bugs — update a bug
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const allowed: Record<string, unknown> = {}
    if (updates.title !== undefined) allowed.title = updates.title
    if (updates.description !== undefined) allowed.description = updates.description
    if (updates.severity !== undefined) allowed.severity = updates.severity
    if (updates.status !== undefined) {
      allowed.status = updates.status
      if (updates.status === 'fixed') allowed.fixed_at = new Date().toISOString()
    }
    if (updates.category !== undefined) allowed.category = updates.category
    if (updates.ai_analysis !== undefined) allowed.ai_analysis = updates.ai_analysis
    if (updates.ai_suggested_files !== undefined) allowed.ai_suggested_files = updates.ai_suggested_files
    if (updates.fixed_by !== undefined) allowed.fixed_by = updates.fixed_by
    if (updates.verified_status !== undefined) {
      allowed.verified_status = updates.verified_status
      allowed.verified_at = new Date().toISOString()
      if (updates.verified_status === 'not_fixed') allowed.status = 'open'
    }
    if (updates.verified_by !== undefined) allowed.verified_by = updates.verified_by
    if (updates.verification_notes !== undefined) allowed.verification_notes = updates.verification_notes
    if (updates.verification_screenshot_url !== undefined) allowed.verification_screenshot_url = updates.verification_screenshot_url

    allowed.updated_at = new Date().toISOString()

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_bugs')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bug: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/bugs?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase.from('ar_bugs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
