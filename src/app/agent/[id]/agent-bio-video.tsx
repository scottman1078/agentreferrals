'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetches the real bio and video_intro_url from ar_profiles
 * and renders them on the agent profile page.
 *
 * Falls back to a generated bio if there is no custom one in the DB.
 */
export function AgentBioFromDB({
  agentId,
  agentName,
  fallbackBio,
}: {
  agentId: string
  agentName: string
  fallbackBio: string
}) {
  const [bio, setBio] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('ar_profiles')
      .select('bio')
      .eq('id', agentId)
      .maybeSingle()
      .then(({ data }: { data: { bio: string | null } | null }) => {
        if (data?.bio) {
          setBio(data.bio)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">About</h2>
      <div className="p-5 rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {loading ? fallbackBio : bio || fallbackBio}
        </p>
      </div>
    </section>
  )
}

/**
 * Shows a "Meet [Name]" video player if the agent has a video_intro_url
 * saved in ar_profiles (uploaded via Settings).
 */
export function AgentVideoIntroFromDB({
  agentId,
  agentName,
}: {
  agentId: string
  agentName: string
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('ar_profiles')
      .select('video_intro_url')
      .eq('id', agentId)
      .maybeSingle()
      .then(({ data }: { data: { video_intro_url: string | null } | null }) => {
        if (data?.video_intro_url) {
          setVideoUrl(data.video_intro_url)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading || !videoUrl) return null

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Meet {agentName.split(' ')[0]}</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="rounded-lg overflow-hidden bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-[420px]"
            preload="metadata"
          />
        </div>
      </div>
    </section>
  )
}
