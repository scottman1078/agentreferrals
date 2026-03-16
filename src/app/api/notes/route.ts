import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/notes?authorId=xxx&agentId=yyy
export async function GET(req: NextRequest) {
  const authorId = req.nextUrl.searchParams.get('authorId')
  const agentId = req.nextUrl.searchParams.get('agentId')

  if (!authorId || !agentId) {
    return NextResponse.json({ error: 'Missing authorId or agentId' }, { status: 400 })
  }

  // Only works with real UUID agent IDs (not mock string IDs)
  if (!UUID_RE.test(authorId) || !UUID_RE.test(agentId)) {
    return NextResponse.json([])
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ar_agent_notes')
    .select('id, content, created_at')
    .eq('author_id', authorId)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/notes { authorId, agentId, content }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { authorId, agentId, content } = body

  if (!authorId || !agentId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!UUID_RE.test(authorId) || !UUID_RE.test(agentId)) {
    return NextResponse.json({ error: 'Notes require real agent profiles (not demo agents)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ar_agent_notes')
    .insert({ author_id: authorId, agent_id: agentId, content: content.trim() })
    .select('id, content, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/notes?id=xxx&authorId=yyy
export async function DELETE(req: NextRequest) {
  const noteId = req.nextUrl.searchParams.get('id')
  const authorId = req.nextUrl.searchParams.get('authorId')

  if (!noteId || !authorId) {
    return NextResponse.json({ error: 'Missing id or authorId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ar_agent_notes')
    .delete()
    .eq('id', noteId)
    .eq('author_id', authorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
