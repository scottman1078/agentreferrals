import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the code in ar_invites where status = 'pending' and referral_code matches
    const { data: invite } = await supabase
      .from('ar_invites')
      .select(`
        id,
        invited_by,
        invitee_name,
        invitee_email,
        referral_code,
        status
      `)
      .eq('referral_code', code)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (invite) {
      // Found a valid invite — look up inviter profile
      const { data: inviterProfile } = await supabase
        .from('ar_profiles')
        .select('id, full_name, email')
        .eq('id', invite.invited_by)
        .single()

      return NextResponse.json({
        valid: true,
        inviteId: invite.id,
        inviterName: inviterProfile?.full_name || 'An AgentReferrals member',
        inviterEmail: inviterProfile?.email || null,
        inviteeEmail: invite.invitee_email?.includes('@pending.invite') ? null : invite.invitee_email,
        inviteeName: invite.invitee_name || null,
      })
    }

    // Super admin bypass codes
    if (code === 'ADMIN-2026' || code === '847293' || code === 'SCOTT-2026-INVITE') {
      return NextResponse.json({
        valid: true,
        inviteId: 'admin-bypass',
        inviterName: 'AgentReferrals Team',
        inviterEmail: 'scott@agentdashboards.com',
      })
    }

    // Also accept codes matching AR-XXXXXXXX pattern for demo purposes
    const demoPattern = /^AR-[A-Z0-9]{8}$/i
    if (demoPattern.test(code)) {
      return NextResponse.json({
        valid: true,
        inviteId: `demo-${code}`,
        inviterName: "Jason Smith",
        inviterEmail: 'jason@sweethomerealty.com',
      })
    }

    return NextResponse.json({ valid: false })
  } catch (error) {
    console.error('[Invite Validate] Error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
