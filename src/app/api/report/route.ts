import { NextRequest, NextResponse } from 'next/server'

// POST /api/report
// Accept a report and log it (mock — no DB persistence)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { reporterId, reportedAgentId, reason, description } = body as {
      reporterId?: string
      reportedAgentId?: string
      reason?: string
      description?: string
    }

    if (!reporterId || !reportedAgentId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: reporterId, reportedAgentId, reason' },
        { status: 400 }
      )
    }

    const validReasons = ['spam', 'harassment', 'fake_profile', 'contact_harvesting', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      )
    }

    // In production this would write to a database table
    console.log('[Report]', { reporterId, reportedAgentId, reason, description })

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
