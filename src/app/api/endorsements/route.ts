import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentEndorsements, getEndorsementCount } from '@/data/endorsements'

// ── GET — fetch endorsements for an agent ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_endorsements')
      .select(`
        id, skill, created_at,
        endorser:ar_profiles!endorser_id (
          id, full_name, color,
          brokerage:ar_brokerages ( name )
        )
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Endorsements] GET DB error, falling back to mock:', error.message)
      const grouped = getAgentEndorsements(agentId)
      const count = getEndorsementCount(agentId)
      return NextResponse.json({ success: true, endorsements: grouped, count, source: 'mock' })
    }

    // Group by skill
    const bySkill: Record<string, { skill: string; count: number; endorsers: { name: string; color: string }[] }> = {}
    for (const e of data || []) {
      const endorser = e.endorser as unknown as { full_name: string; color: string } | null
      if (!bySkill[e.skill]) {
        bySkill[e.skill] = { skill: e.skill, count: 0, endorsers: [] }
      }
      bySkill[e.skill].count++
      if (endorser) {
        bySkill[e.skill].endorsers.push({ name: endorser.full_name, color: endorser.color })
      }
    }

    const grouped = Object.values(bySkill).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      endorsements: grouped,
      count: (data || []).length,
      source: 'supabase',
    })
  } catch (error) {
    console.error('[Endorsements] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — endorse an agent for one or more skills ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, endorserId, skills } = body

    if (!agentId || !endorserId || !skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (agentId === endorserId) {
      return NextResponse.json({ error: 'Cannot endorse yourself' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const rows = skills.map((skill: string) => ({
      agent_id: agentId,
      endorser_id: endorserId,
      skill,
    }))

    const { data, error } = await supabase
      .from('ar_endorsements')
      .upsert(rows, { onConflict: 'agent_id,endorser_id,skill' })
      .select()

    if (error) {
      console.error('[Endorsements] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, endorsements: data })
  } catch (error) {
    console.error('[Endorsements] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE — remove an endorsement ──
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const endorserId = searchParams.get('endorserId')
    const skill = searchParams.get('skill')

    if (!agentId || !endorserId || !skill) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_endorsements')
      .delete()
      .eq('agent_id', agentId)
      .eq('endorser_id', endorserId)
      .eq('skill', skill)

    if (error) {
      console.error('[Endorsements] DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Endorsements] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
