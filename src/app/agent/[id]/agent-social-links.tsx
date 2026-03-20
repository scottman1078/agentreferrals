'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowUpRight } from 'lucide-react'

interface SocialLinks {
  social_instagram: string | null
  social_facebook: string | null
  social_linkedin: string | null
  social_tiktok: string | null
  social_youtube: string | null
  social_twitter: string | null
}

const PLATFORMS: { key: keyof SocialLinks; label: string; urlPrefix: string; color: string }[] = [
  { key: 'social_instagram', label: 'Instagram', urlPrefix: 'https://instagram.com/', color: '#E4405F' },
  { key: 'social_facebook', label: 'Facebook', urlPrefix: 'https://facebook.com/', color: '#1877F2' },
  { key: 'social_linkedin', label: 'LinkedIn', urlPrefix: 'https://linkedin.com/in/', color: '#0A66C2' },
  { key: 'social_tiktok', label: 'TikTok', urlPrefix: 'https://tiktok.com/@', color: '#000000' },
  { key: 'social_youtube', label: 'YouTube', urlPrefix: 'https://youtube.com/', color: '#FF0000' },
  { key: 'social_twitter', label: 'X', urlPrefix: 'https://x.com/', color: '#000000' },
]

function toUrl(value: string, urlPrefix: string): string {
  const v = value.trim()
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  // Handle @handle format
  const handle = v.startsWith('@') ? v.slice(1) : v
  return `${urlPrefix}${handle}`
}

export function AgentSocialLinks({ agentId }: { agentId: string }) {
  const [links, setLinks] = useState<SocialLinks | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('ar_profiles')
      .select('social_instagram, social_facebook, social_linkedin, social_tiktok, social_youtube, social_twitter')
      .eq('id', agentId)
      .maybeSingle()
      .then(({ data }: { data: SocialLinks | null }) => {
        if (data) setLinks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading || !links) return null

  const activeLinks = PLATFORMS.filter((p) => links[p.key])
  if (activeLinks.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Connect</h2>
      <div className="flex flex-wrap gap-2">
        {activeLinks.map((platform) => (
          <a
            key={platform.key}
            href={toUrl(links[platform.key]!, platform.urlPrefix)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: platform.color }}
          >
            {platform.label}
            <ArrowUpRight className="w-3 h-3" />
          </a>
        ))}
      </div>
    </section>
  )
}
