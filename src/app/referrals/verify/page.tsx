'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ArrowUpRight } from 'lucide-react'

interface ReferralData {
  id: string
  partner_name: string
  partner_email: string
  submitter_name: string
  direction: 'sent' | 'received'
  market: string | null
  sale_price: number | null
  close_date: string | null
  status: 'pending' | 'verified' | 'disputed'
}

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirmed' | 'disputed' | 'error' | 'already_processed'>('loading')
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token found. Please check your email link.')
      return
    }

    // Fetch referral details via the confirm endpoint with a GET-like check
    // We'll load the referral data by calling a lightweight lookup
    const loadReferral = async () => {
      try {
        const res = await fetch('/api/referrals/verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, preview: true }),
        })
        const data = await res.json()

        if (!res.ok) {
          if (data.status === 'verified' || data.status === 'disputed') {
            setStatus('already_processed')
            setErrorMsg(data.status === 'verified'
              ? 'This referral has already been verified.'
              : 'This referral has already been marked as disputed.')
          } else {
            setStatus('error')
            setErrorMsg(data.error || 'Invalid or expired verification link.')
          }
          return
        }

        setReferral(data.referral)
        setStatus('ready')
      } catch {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again later.')
      }
    }

    loadReferral()
  }, [token])

  const handleResponse = async (confirmed: boolean) => {
    if (!token) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/referrals/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process your response.')
        setSubmitting(false)
        return
      }

      setStatus(confirmed ? 'confirmed' : 'disputed')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeYear = referral?.close_date
    ? new Date(referral.close_date).getFullYear()
    : null

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-500 rounded-xl text-[#0f1117] font-extrabold text-lg">
            A
          </div>
          <div className="mt-2 font-extrabold text-xl">
            Agent<span className="text-amber-500">Referrals</span>.ai
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
          {/* Loading */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading referral details...</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold mb-2">Verification Failed</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
          )}

          {/* Already Processed */}
          {status === 'already_processed' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold mb-2">Already Processed</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
          )}

          {/* Ready — Show referral details */}
          {status === 'ready' && referral && (
            <>
              <h2 className="text-lg font-bold text-center mb-1">Verify a Past Referral</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Please review the details below and confirm whether this referral is accurate.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    referral.direction === 'sent'
                      ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600'
                      : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
                  }`}>
                    <ArrowUpRight className={`w-4 h-4 ${referral.direction === 'received' ? 'rotate-180' : ''}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{referral.submitter_name}</div>
                    <div className="text-xs text-gray-500">
                      {referral.direction === 'sent'
                        ? 'Says they sent you a referral'
                        : 'Says they received a referral from you'}
                    </div>
                  </div>
                </div>

                {referral.market && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Market</span>
                    <span className="font-medium">{referral.market}</span>
                  </div>
                )}

                {referral.sale_price && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sale Price</span>
                    <span className="font-medium">${Number(referral.sale_price).toLocaleString()}</span>
                  </div>
                )}

                {closeYear && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Close Year</span>
                    <span className="font-medium">{closeYear}</span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="text-sm text-red-500 text-center mb-4">{errorMsg}</p>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => handleResponse(true)}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Yes, this is accurate
                </button>
                <button
                  onClick={() => handleResponse(false)}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  No, I don&apos;t recognize this
                </button>
              </div>
            </>
          )}

          {/* Confirmed */}
          {status === 'confirmed' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold mb-2">Referral Verified!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Thank you for confirming this referral. This helps build a trusted referral network.
              </p>

              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">
                  Join AgentReferrals
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-3">
                  Build your verified referral track record, find partners across the country, and grow your business.
                </p>
                <a
                  href="https://agentreferrals.ai"
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-amber-500 text-[#0f1117] text-sm font-bold hover:bg-amber-400 transition-colors"
                >
                  Get Started Free
                </a>
              </div>
            </div>
          )}

          {/* Disputed */}
          {status === 'disputed' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold mb-2">Referral Disputed</h2>
              <p className="text-sm text-gray-500">
                Thank you for your response. This referral has been marked as disputed and will not appear on the submitter&apos;s verified record.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-400">
          AgentReferrals — AI-powered referral network for real estate agents
        </div>
      </div>
    </div>
  )
}

export default function VerifyReferralPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
