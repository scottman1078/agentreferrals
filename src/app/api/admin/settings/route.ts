import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/settings — return all settings as key-value pairs
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_settings')
      .select('key, value, updated_at')
      .order('key')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to a flat key-value map for easy consumption
    const settings: Record<string, unknown> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings, rows: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/settings — update a setting { key, value }
export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_settings')
      .upsert(
        { key, value: { value }, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
