import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Try to insert into ar_waitlist table
    // If the table doesn't exist yet, we just log and return success
    try {
      await supabase
        .from('ar_waitlist')
        .upsert(
          {
            email,
            name: name || null,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
    } catch (dbError) {
      // Table may not exist yet — log and continue
      console.log('[Waitlist] DB insert skipped (table may not exist):', dbError)
    }

    console.log(`[Waitlist] New signup: ${email} (${name || 'no name'})`)

    // Return mock position for now
    const mockPosition = Math.floor(Math.random() * 200) + 4700

    return NextResponse.json({
      success: true,
      position: mockPosition,
    })
  } catch (error) {
    console.error('[Waitlist] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
