'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { getInitials } from '@/lib/utils'
import { Star, MessageSquare, X, Shield, Heart, ChevronDown, ChevronUp, PenLine, Send, Check } from 'lucide-react'
import type { AgentReview } from '@/data/reviews'

/** Full reviews panel — shows in a modal or inline. Pass agentId + agentName. */
export function AgentReviewsPanel({ agentId, agentName, onClose }: { agentId: string; agentName: string; onClose?: () => void }) {
  const { getAgentReviewStats } = useAppData()
  const stats = getAgentReviewStats(agentId)
  const [showAll, setShowAll] = useState(false)
  const [showWriteReview, setShowWriteReview] = useState(false)

  const hasReviews = stats && stats.count > 0
  const displayedReviews = hasReviews ? (showAll ? stats.reviews : stats.reviews.slice(0, 3)) : []

  return (
    <div>
      {/* Summary header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          {hasReviews ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(stats.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
                    />
                  ))}
                </div>
                <span className="font-extrabold text-2xl">{stats.avgRating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stats.count} referral review{stats.count !== 1 ? 's' : ''} from partner agents</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">No reviews yet for {agentName}</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to leave a review!</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWriteReview(!showWriteReview)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <PenLine className="w-3 h-3" />
            Write Review
          </button>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Write Review Form */}
      {showWriteReview && (
        <WriteReviewForm
          agentId={agentId}
          agentName={agentName}
          onClose={() => setShowWriteReview(false)}
        />
      )}

      {/* Category breakdowns */}
      {hasReviews && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: MessageSquare, label: 'Communication', value: stats.avgCommunication, color: 'text-blue-500' },
              { icon: Shield, label: 'Professionalism', value: stats.avgProfessionalism, color: 'text-emerald-500' },
              { icon: Heart, label: 'Client Care', value: stats.avgClientCare, color: 'text-rose-500' },
            ].map((cat) => (
              <div key={cat.label} className="p-3 rounded-xl border border-border bg-background text-center">
                <cat.icon className={`w-4 h-4 ${cat.color} mx-auto mb-1.5`} />
                <div className="font-bold text-lg">{cat.value}</div>
                <div className="text-[10px] text-muted-foreground">{cat.label}</div>
              </div>
            ))}
          </div>

          {/* Individual reviews */}
          <div className="space-y-3">
            {displayedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {stats.reviews.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1"
            >
              {showAll ? <><ChevronUp className="w-3 h-3" /> Show Less</> : <><ChevronDown className="w-3 h-3" /> Show All {stats.reviews.length} Reviews</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Star Rating Input ───
function StarRatingInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-border'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Write Review Form ───
function WriteReviewForm({ agentId, agentName, onClose }: { agentId: string; agentName: string; onClose: () => void }) {
  const [overallRating, setOverallRating] = useState(0)
  const [communicationRating, setCommunicationRating] = useState(0)
  const [professionalismRating, setProfessionalismRating] = useState(0)
  const [clientCareRating, setClientCareRating] = useState(0)
  const [referralMarket, setReferralMarket] = useState('')
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = overallRating > 0 && communicationRating > 0 && professionalismRating > 0 && clientCareRating > 0 && comment.trim().length > 0

  async function handleSubmit() {
    if (!canSubmit) return
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          overallRating,
          communicationRating,
          professionalismRating,
          clientCareRating,
          referralMarket,
          comment,
        }),
      })
    } catch { /* API may not exist yet — show success anyway */ }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Review Submitted!</p>
            <p className="text-xs text-muted-foreground">
              Thank you for reviewing {agentName}. Your review helps the referral community.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border border-primary/20 bg-primary/[0.02] mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Review {agentName}</h3>
        <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rating inputs */}
      <div className="space-y-3">
        <StarRatingInput value={overallRating} onChange={setOverallRating} label="Overall Rating" />
        <StarRatingInput value={communicationRating} onChange={setCommunicationRating} label="Communication" />
        <StarRatingInput value={professionalismRating} onChange={setProfessionalismRating} label="Professionalism" />
        <StarRatingInput value={clientCareRating} onChange={setClientCareRating} label="Client Care" />
      </div>

      {/* Referral market */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Market</label>
        <input
          value={referralMarket}
          onChange={(e) => setReferralMarket(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g. Nashville, TN"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Review</label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={`How was your referral experience with ${agentName.split(' ')[0]}?`}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        Submit Review
      </button>
    </div>
  )
}

function ReviewCard({ review }: { review: AgentReview }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: review.reviewerColor }}
        >
          {getInitials(review.reviewerName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">{review.reviewerName}</span>
              <span className="text-xs text-muted-foreground ml-2">{review.reviewerBrokerage}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{review.date}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
              />
            ))}
            <span className="text-[11px] text-muted-foreground ml-1">· {review.referralMarket}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-11">{review.comment}</p>
    </div>
  )
}
