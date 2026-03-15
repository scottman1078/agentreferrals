'use client'

interface AgreementPreviewProps {
  referringAgentName: string
  referringAgentBrokerage: string
  referringAgentEmail: string
  receivingAgentName: string
  receivingAgentBrokerage: string
  receivingAgentEmail: string
  clientName: string
  market: string
  estimatedPrice: number
  feeMode: 'percent' | 'flat'
  feePercent: number
  feeFlat: number
  expirationDate: string
  additionalTerms: string
  date?: string
}

export default function AgreementPreview({
  referringAgentName,
  referringAgentBrokerage,
  referringAgentEmail,
  receivingAgentName,
  receivingAgentBrokerage,
  receivingAgentEmail,
  clientName,
  market,
  estimatedPrice,
  feeMode,
  feePercent,
  feeFlat,
  expirationDate,
  additionalTerms,
  date,
}: AgreementPreviewProps) {
  const today = date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const feeDisplay =
    feeMode === 'percent'
      ? `${feePercent}% of gross commission earned`
      : `$${feeFlat.toLocaleString()} flat fee`

  const formattedPrice = estimatedPrice > 0 ? `$${estimatedPrice.toLocaleString()}` : '---'

  const expDisplay = expirationDate
    ? new Date(expirationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '---'

  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Document body — always light mode, serif for legal text */}
      <div className="p-6 sm:p-8" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {/* Header */}
        <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid #1a1a1a' }}>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 mb-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
            AgentReferrals Platform
          </div>
          <h1 className="text-xl font-bold tracking-wide text-gray-900 uppercase" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.08em' }}>
            Referral Fee Agreement
          </h1>
          <div className="text-xs text-gray-500 mt-1.5" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Date: {today}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded bg-gray-50 border border-gray-100">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Referring Agent
            </div>
            <div className="text-sm font-bold text-gray-900">{referringAgentName || '---'}</div>
            <div className="text-xs text-gray-600 mt-0.5">{referringAgentBrokerage || '---'}</div>
            <div className="text-xs text-gray-500 mt-0.5">{referringAgentEmail || '---'}</div>
          </div>
          <div className="p-3 rounded bg-gray-50 border border-gray-100">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 font-bold" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Receiving Agent
            </div>
            <div className="text-sm font-bold text-gray-900">{receivingAgentName || '---'}</div>
            <div className="text-xs text-gray-600 mt-0.5">{receivingAgentBrokerage || '---'}</div>
            <div className="text-xs text-gray-500 mt-0.5">{receivingAgentEmail || '---'}</div>
          </div>
        </div>

        {/* Deal Terms */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-bold" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Referral Details
          </div>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Client', value: clientName || '---' },
                { label: 'Market / Area', value: market || '---' },
                { label: 'Estimated Sale Price', value: formattedPrice },
                { label: 'Referral Fee', value: feeDisplay },
              ].map((row) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td className="py-2 pr-3 text-gray-500 text-xs font-semibold uppercase" style={{ width: '40%', fontFamily: 'system-ui, sans-serif' }}>
                    {row.label}
                  </td>
                  <td className="py-2 text-gray-900 font-medium">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terms */}
        <div className="mb-6 text-xs leading-relaxed text-gray-700" style={{ lineHeight: '1.7' }}>
          <p className="mb-3">
            This agreement confirms that <strong>{referringAgentName || '[Referring Agent]'}</strong> (&ldquo;Referring Agent&rdquo;)
            is referring the above-named client to <strong>{receivingAgentName || '[Receiving Agent]'}</strong> (&ldquo;Receiving Agent&rdquo;)
            for real estate services in the <strong>{market || '[Market]'}</strong> area.
          </p>
          <p className="mb-3">
            The Receiving Agent agrees to pay the Referring Agent a referral fee of <strong>{feeDisplay}</strong> upon
            the successful closing of any real estate transaction involving the referred client. Payment shall be made
            within 10 business days of the closing date and receipt of commission by the Receiving Agent&apos;s brokerage.
          </p>
          <p className="mb-3">
            Both parties acknowledge that this is a referral arrangement only. The Referring Agent makes no guarantees
            regarding the client&apos;s intent to purchase, sell, or complete a transaction. The Receiving Agent agrees
            to provide professional service and keep the Referring Agent informed of material progress.
          </p>
          {additionalTerms && (
            <div className="mt-3 p-3 rounded bg-gray-50 border border-gray-100">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Additional Terms
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{additionalTerms}</p>
            </div>
          )}
        </div>

        {/* Expiration */}
        <div className="text-xs text-gray-600 mb-6 p-2.5 rounded bg-amber-50 border border-amber-100">
          <strong>Expiration:</strong> This agreement expires on <strong>{expDisplay}</strong>.
          If no transaction has closed by this date, this agreement is null and void unless renewed in writing.
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 pt-4" style={{ borderTop: '1px solid #d1d5db' }}>
          {[
            { name: referringAgentName, role: 'Referring Agent' },
            { name: receivingAgentName, role: 'Receiving Agent' },
          ].map((party) => (
            <div key={party.role} className="text-center">
              <div className="h-12 border-b border-gray-400 mb-2" />
              <div className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'system-ui, sans-serif' }}>Signature</div>
              <div className="text-sm font-bold text-gray-900">{party.name || '---'}</div>
              <div className="text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'system-ui, sans-serif' }}>{party.role}</div>
              <div className="mt-2 h-6 border-b border-gray-300 mb-1" />
              <div className="text-[10px] text-gray-400" style={{ fontFamily: 'system-ui, sans-serif' }}>Date</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-3 text-[10px] text-gray-400" style={{ borderTop: '1px solid #e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
          Generated via AgentReferrals &middot; agentreferrals.ai
        </div>
      </div>
    </div>
  )
}
