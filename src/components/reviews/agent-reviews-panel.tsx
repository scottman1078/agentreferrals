'use client'

import { useState } from 'react'
import { getAgentReviewStats } from '@/data/reviews'
import { getInitials } from '@/lib/utils'
import { Star, MessageSquare, X, Shield, Clock, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import type { AgentReview } from '@/data/reviews'

/** Full reviews panel — shows in a modal or inline. Pass agentId + agentName. */
export function AgentReviewsPanel({ agentId, agentName, onClose }: { agentId: string; agentName: string; onClose?: () => void }) {
  const stats = getAgentReviewStats(agentId)
  const [showAll, setShowAll] = useState(false)

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No reviews yet for {agentName}</p>
      </div>
    )
  }

  const displayedReviews = showAll ? stats.reviews : stats.reviews.slice(0, 3)

  return (
    <div>
      {/* Summary header */}
      <div className="flex items-start justify-between mb-5">
        <div>
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
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category breakdowns */}
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
