'use client'

import { useState, useEffect, useCallback } from 'react'

export interface VideoIntroData {
  id: string
  agent_id: string
  video_url: string
  thumbnail_url: string | null
  duration: number
  title: string
  views: number
  created_at: string
}

export interface ZoomInterviewData {
  id: string
  requester_id: string
  interviewee_id: string
  status: string
  scheduled_at: string | null
  zoom_link: string | null
  recording_url: string | null
  is_public: boolean
  duration: number | null
  notes: string | null
  requested_at: string
  completed_at: string | null
  requester?: { id: string; full_name: string; color: string; brokerage: { name: string } | null }
  interviewee?: { id: string; full_name: string; color: string; brokerage: { name: string } | null }
}

export function useVideoIntro(agentId: string | undefined) {
  const [videoIntro, setVideoIntro] = useState<VideoIntroData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchVideoIntro = useCallback(async () => {
    if (!agentId) { setIsLoading(false); return }
    try {
      const res = await fetch(`/api/video-intros?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) setVideoIntro(data.videoIntro)
    } catch (err) {
      console.error('[useVideoIntro] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchVideoIntro() }, [fetchVideoIntro])

  return { videoIntro, isLoading, refetch: fetchVideoIntro }
}

export function useZoomInterviews(agentId: string | undefined, publicOnly = false) {
  const [interviews, setInterviews] = useState<ZoomInterviewData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInterviews = useCallback(async () => {
    if (!agentId) { setIsLoading(false); return }
    try {
      const params = new URLSearchParams({ agentId })
      if (publicOnly) params.set('public', 'true')
      const res = await fetch(`/api/zoom-interviews?${params}`)
      const data = await res.json()
      if (data.success) setInterviews(data.interviews)
    } catch (err) {
      console.error('[useZoomInterviews] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, publicOnly])

  useEffect(() => { fetchInterviews() }, [fetchInterviews])

  return { interviews, isLoading, refetch: fetchInterviews }
}

export async function uploadVideoIntro(data: { agentId: string; videoUrl: string; thumbnailUrl?: string; duration: number; title: string }) {
  const res = await fetch('/api/video-intros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function requestZoomInterview(requesterId: string, intervieweeId: string, message?: string) {
  const res = await fetch('/api/zoom-interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterId, intervieweeId, message }),
  })
  return res.json()
}

export async function updateZoomInterview(interviewId: string, updates: Record<string, unknown>) {
  const res = await fetch('/api/zoom-interviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interviewId, ...updates }),
  })
  return res.json()
}
