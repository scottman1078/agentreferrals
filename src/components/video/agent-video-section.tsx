'use client'

import { useState } from 'react'
import {
  getVideoIntro,
  getPublicInterviews,
  formatDuration,
} from '@/data/video-intros'
import type { ZoomInterview } from '@/data/video-intros'
import { getInitials } from '@/lib/utils'
import {
  Play,
  Video,
  Upload,
  Calendar,
  Clock,
  Eye,
  Users,
  Check,
  X,
  VideoIcon,
} from 'lucide-react'

/** Full video section for agent profile — shows video intro + public interviews */
export function AgentVideoSection({
  agentId,
  agentName,
  agentColor,
}: {
  agentId: string
  agentName: string
  agentColor: string
}) {
  const videoIntro = getVideoIntro(agentId)
  const publicInterviews = getPublicInterviews(agentId)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [activeVideo, setActiveVideo] = useState<'intro' | string | null>(null)

  const hasContent = videoIntro || publicInterviews.length > 0

  return (
    <div className="space-y-5">
      {/* ── Video Intro ── */}
      {videoIntro ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              Video Introduction
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {videoIntro.views} views
            </div>
          </div>

          {/* Video player placeholder */}
          <div
            className="relative rounded-xl border border-border bg-black/5 dark:bg-white/5 overflow-hidden cursor-pointer group"
            onClick={() => setActiveVideo(activeVideo === 'intro' ? null : 'intro')}
          >
            {activeVideo === 'intro' ? (
              /* Simulated playing state */
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center space-y-3">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto"
                    style={{ background: agentColor }}
                  >
                    {getInitials(agentName)}
                  </div>
                  <p className="text-white text-sm font-semibold">{videoIntro.title}</p>
                  <p className="text-white/60 text-xs">Video playback — {formatDuration(videoIntro.duration)}</p>
                  <div className="w-48 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-[progress_5s_ease-in-out_infinite]" style={{ width: '35%' }} />
                  </div>
                </div>
              </div>
            ) : (
              /* Thumbnail / play button */
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <div className="text-center space-y-3">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto ring-4 ring-white/20"
                    style={{ background: agentColor }}
                  >
                    {getInitials(agentName)}
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{videoIntro.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(videoIntro.duration)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No video — upload CTA */
        <div className="p-6 rounded-xl border border-dashed border-border bg-card text-center">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">No Video Introduction Yet</p>
          <p className="text-xs text-muted-foreground mb-3">
            A short video intro helps other agents get to know {agentName.split(' ')[0]} before partnering.
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <Upload className="w-3.5 h-3.5" />
            Upload Video Intro
          </button>
        </div>
      )}

      {/* ── Zoom Interviews ── */}
      {publicInterviews.length > 0 && (
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-500" />
            Agent Interviews ({publicInterviews.length})
          </h3>
          <div className="space-y-2">
            {publicInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                agentId={agentId}
                isActive={activeVideo === interview.id}
                onToggle={() =>
                  setActiveVideo(activeVideo === interview.id ? null : interview.id)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Request Interview CTA ── */}
      {!showRequestForm ? (
        <button
          onClick={() => setShowRequestForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm font-semibold"
        >
          <VideoIcon className="w-4 h-4 text-primary" />
          Request Zoom Interview with {agentName.split(' ')[0]}
        </button>
      ) : (
        <RequestInterviewForm
          agentName={agentName}
          onClose={() => setShowRequestForm(false)}
        />
      )}
    </div>
  )
}

// ── Interview Card ──
function InterviewCard({
  interview,
  agentId,
  isActive,
  onToggle,
}: {
  interview: ZoomInterview
  agentId: string
  isActive: boolean
  onToggle: () => void
}) {
  const otherName =
    interview.requesterId === agentId
      ? interview.intervieweeName
      : interview.requesterName
  const dateStr = interview.completedAt
    ? new Date(interview.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
            <VideoIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">
              Interview with {otherName}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dateStr}
              </span>
              {interview.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {interview.duration} min
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
        </div>
      </button>

      {/* Expanded player */}
      {isActive && (
        <div className="border-t border-border">
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <div className="text-center space-y-2">
              <VideoIcon className="w-10 h-10 text-white/40 mx-auto" />
              <p className="text-white/80 text-sm font-semibold">
                Interview with {otherName}
              </p>
              <p className="text-white/40 text-xs">{interview.duration} min recording</p>
              <div className="w-48 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full animate-[progress_8s_ease-in-out_infinite]"
                  style={{ width: '20%' }}
                />
              </div>
            </div>
          </div>
          {interview.notes && (
            <div className="p-3 text-xs text-muted-foreground border-t border-border">
              <span className="font-semibold text-foreground">Topics covered:</span>{' '}
              {interview.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Request Interview Form ──
function RequestInterviewForm({
  agentName,
  onClose,
}: {
  agentName: string
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    // TODO: POST to Supabase + send Zoom invite
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Interview Requested!</p>
            <p className="text-xs text-muted-foreground">
              {agentName} will receive your request and can schedule a time.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-primary" />
          Request Interview
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Request a short Zoom call with {agentName.split(' ')[0]} to learn about their market,
        process, and partnership style. Interviews can be recorded and made public on both profiles.
      </p>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Message (optional)
        </label>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={`Hi ${agentName.split(' ')[0]}, I'd love to chat about partnering in your market...`}
        />
      </div>
      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <VideoIcon className="w-3.5 h-3.5" />
        Send Interview Request
      </button>
    </div>
  )
}

/** Compact badge showing video intro availability */
export function AgentVideoBadge({ agentId }: { agentId: string }) {
  const hasVideo = !!getVideoIntro(agentId)
  const interviewCount = getPublicInterviews(agentId).length

  if (!hasVideo && interviewCount === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      {hasVideo && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
          <Video className="w-3 h-3" />
          Video Intro
        </span>
      )}
      {interviewCount > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
          <Users className="w-3 h-3" />
          {interviewCount} Interview{interviewCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
