import { NextResponse } from 'next/server'

// GET /api/specializations — return all ACTIVE specializations (public endpoint)
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_specializations')
      .select('id, name, color, emoji, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ specializations: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
