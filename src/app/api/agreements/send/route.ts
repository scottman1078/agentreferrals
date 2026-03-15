import { NextRequest, NextResponse } from 'next/server'
import { isSignConfigured, getApiKey } from '@/lib/dropbox-sign'

interface SendPayload {
  title: string
  subject: string
  message: string
  signerEmail: string
  signerName: string
  senderEmail: string
  senderName: string
  referralFee: string
  estimatedPrice: number
  clientName: string
  market: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPayload = await request.json()
    const { title, subject, message, signerEmail, signerName, senderEmail, senderName } = body

    if (!signerEmail || !signerName || !senderEmail || !senderName) {
      return NextResponse.json({ error: 'Missing required signer or sender info' }, { status: 400 })
    }

    // If no API key configured, return a mock success (demo mode)
    if (!isSignConfigured()) {
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return NextResponse.json({
        signatureRequestId: mockId,
        signUrl: null,
        mock: true,
        message: 'Demo mode — no Dropbox Sign API key configured. Agreement simulated.',
      })
    }

    // Live Dropbox Sign request via REST API
    const apiKey = getApiKey()!
    const authHeader = 'Basic ' + Buffer.from(apiKey + ':').toString('base64')

    const res = await fetch('https://api.hellosign.com/v3/signature_request/send', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title || 'Referral Fee Agreement',
        subject: subject || 'Referral Agreement — Please Sign',
        message: message || 'Please review and sign the attached referral fee agreement.',
        signers: [
          { email_address: senderEmail, name: senderName, order: 0 },
          { email_address: signerEmail, name: signerName, order: 1 },
        ],
        test_mode: true, // Set to false for production
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Agreements/Send] Dropbox Sign error:', err)
      return NextResponse.json({ error: 'Dropbox Sign API error' }, { status: 502 })
    }

    const result = await res.json()
    return NextResponse.json({
      signatureRequestId: result.signature_request?.signature_request_id || null,
      signUrl: null,
      mock: false,
    })
  } catch (error) {
    console.error('[Agreements/Send] Error:', error)
    return NextResponse.json({ error: 'Failed to send agreement' }, { status: 500 })
  }
}
