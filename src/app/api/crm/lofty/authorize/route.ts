import { NextResponse } from 'next/server'
import { buildLoftyAuthorizeUrl, LOFTY_CONFIG } from '@/lib/integration-utils'

// GET /api/crm/lofty/authorize — redirect user to Lofty OAuth consent page
export async function GET() {
  if (!LOFTY_CONFIG.clientId) {
    return NextResponse.json(
      { error: 'Lofty OAuth is not configured. Set NEXT_PUBLIC_LOFTY_CLIENT_ID.' },
      { status: 500 }
    )
  }

  const authorizeUrl = buildLoftyAuthorizeUrl(LOFTY_CONFIG.clientId)
  return NextResponse.redirect(authorizeUrl)
}
