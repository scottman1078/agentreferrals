import { NextRequest, NextResponse } from 'next/server'
import { isSignConfigured, getApiKey } from '@/lib/dropbox-sign'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const signatureRequestId = searchParams.get('signatureRequestId')

    if (!signatureRequestId) {
      return NextResponse.json({ error: 'Missing signatureRequestId parameter' }, { status: 400 })
    }

    // If no API key or mock ID, return mock status
    if (!isSignConfigured() || signatureRequestId.startsWith('mock_')) {
      return NextResponse.json({
        signatureRequestId,
        status: 'awaiting_signatures',
        signers: [
          { name: 'Sender', email: 'sender@example.com', status: 'signed', signedAt: new Date().toISOString() },
          { name: 'Receiver', email: 'receiver@example.com', status: 'awaiting_signature', signedAt: null },
        ],
        mock: true,
      })
    }

    // Live status check via REST API
    const apiKey = getApiKey()!
    const authHeader = 'Basic ' + Buffer.from(apiKey + ':').toString('base64')

    const res = await fetch(`https://api.hellosign.com/v3/signature_request/${signatureRequestId}`, {
      headers: { 'Authorization': authHeader },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Agreements/Status] Dropbox Sign error:', err)
      return NextResponse.json({ error: 'Dropbox Sign API error' }, { status: 502 })
    }

    const result = await res.json()
    const signatureRequest = result.signature_request

    const isComplete = signatureRequest?.is_complete || false
    const signers = (signatureRequest?.signatures || []).map((sig: { signer_name?: string; signer_email_address?: string; status_code?: string; signed_at?: number }) => ({
      name: sig.signer_name || '',
      email: sig.signer_email_address || '',
      status: sig.status_code || 'awaiting_signature',
      signedAt: sig.signed_at ? new Date(sig.signed_at * 1000).toISOString() : null,
    }))

    return NextResponse.json({
      signatureRequestId,
      status: isComplete ? 'complete' : 'awaiting_signatures',
      signers,
      mock: false,
    })
  } catch (error) {
    console.error('[Agreements/Status] Error:', error)
    return NextResponse.json({ error: 'Failed to check agreement status' }, { status: 500 })
  }
}
