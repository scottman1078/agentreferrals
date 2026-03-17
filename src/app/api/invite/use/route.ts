import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, userId } = body

    if (!code || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Skip DB update for demo codes
    const demoPattern = /^AR-[A-Z0-9]{8}$/i
    if (demoPattern.test(code) && code.startsWith('AR-')) {
      // Check if it's an actual DB record first
      const { data: invite } = await supabase
        .from('ar_invites')
        .select('id, invited_by')
        .eq('referral_code', code)
        .eq('status', 'pending')
        .limit(1)
        .single()

      if (invite) {
        // Mark the real invite as used
        await supabase
          .from('ar_invites')
          .update({
            status: 'signed_up',
            used_by: userId,
            used_at: new Date().toISOString(),
          })
          .eq('id', invite.id)

        return NextResponse.json({ success: true, inviterId: invite.invited_by })
      }

      // Demo code — just return success
      return NextResponse.json({ success: true, inviterId: null })
    }

    // Look up the code in ar_invites
    const { data: invite, error: lookupError } = await supabase
      .from('ar_invites')
      .select('id, invited_by')
      .eq('referral_code', code)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (lookupError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 })
    }

    // Mark the invite as used
    const { error: updateError } = await supabase
      .from('ar_invites')
      .update({
        status: 'signed_up',
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('[Invite Use] Update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true, inviterId: invite.invited_by })
  } catch (error) {
    console.error('[Invite Use] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
