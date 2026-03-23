'use client'

import { useState, useRef } from 'react'
import { Video, Trash2, Loader2, Check, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadVideo } from '@/lib/supabase/upload-video'

/**
 * Extract a YouTube video ID from various URL formats:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://youtube.com/shorts/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  return match?.[1] ?? null
}

interface VideoIntroEditorProps {
  profileId: string
  videoIntroUrl: string | null
  isAuthenticated: boolean
  onSaved: (url: string | null, toast: string) => void
  demoGuard: () => boolean
}

export function VideoIntroEditor({
  profileId,
  videoIntroUrl: initialUrl,
  isAuthenticated,
  onSaved,
  demoGuard,
}: VideoIntroEditorProps) {
  const [videoIntroUrl, setVideoIntroUrl] = useState<string | null>(initialUrl)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [youtubeUrlInput, setYoutubeUrlInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [savingYoutubeUrl, setSavingYoutubeUrl] = useState(false)

  // Keep in sync with parent if initialUrl changes
  // (simple prop-to-state sync for controlled usage)

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (demoGuard()) return
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')

    if (file.size > 50 * 1024 * 1024) {
      setVideoError('Video must be under 50MB')
      return
    }

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const duration = await new Promise<number>((resolve) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(video.duration)
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      video.src = url
    })

    if (duration === 0) {
      setVideoError('Could not read video file. Please try a different format.')
      return
    }
    if (duration > 60) {
      setVideoError(`Video is ${Math.ceil(duration)}s — max 60 seconds allowed`)
      return
    }

    setUploadingVideo(true)
    const { url: videoUrl, error } = await uploadVideo(profileId, file, 'intro')

    if (error || !videoUrl) {
      console.error('[Video] Upload error:', error)
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        const supabase = createClient()
        await supabase
          .from('ar_profiles')
          .update({ video_intro_url: dataUrl })
          .eq('id', profileId)
        setVideoIntroUrl(dataUrl)
        setUploadingVideo(false)
        onSaved(dataUrl, 'Video intro uploaded')
      }
      reader.readAsDataURL(file)
      return
    }

    const supabase = createClient()
    await supabase
      .from('ar_profiles')
      .update({ video_intro_url: videoUrl })
      .eq('id', profileId)

    setVideoIntroUrl(videoUrl)
    setUploadingVideo(false)
    onSaved(videoUrl, 'Video intro uploaded')
  }

  async function handleVideoRemove() {
    if (demoGuard()) return
    const supabase = createClient()
    await supabase
      .from('ar_profiles')
      .update({ video_intro_url: null })
      .eq('id', profileId)
    setVideoIntroUrl(null)
    onSaved(null, 'Video intro removed')
  }

  async function handleYouTubeSave() {
    if (demoGuard()) return
    const trimmed = youtubeUrlInput.trim()
    if (!trimmed) {
      setVideoError('Please enter a YouTube URL')
      return
    }
    const videoId = extractYouTubeId(trimmed)
    if (!videoId) {
      setVideoError('Invalid YouTube URL. Please paste a valid youtube.com or youtu.be link.')
      return
    }
    setVideoError('')
    setSavingYoutubeUrl(true)

    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    const supabase = createClient()
    await supabase
      .from('ar_profiles')
      .update({ video_intro_url: embedUrl })
      .eq('id', profileId)

    setVideoIntroUrl(embedUrl)
    setYoutubeUrlInput('')
    setShowYoutubeInput(false)
    setSavingYoutubeUrl(false)
    onSaved(embedUrl, 'YouTube video saved')
  }

  const isYouTube = videoIntroUrl?.includes('youtube.com/embed/') ?? false

  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <div className="font-bold text-sm mb-1 pb-3 border-b border-border flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        Video Introduction
      </div>
      <p className="text-xs text-muted-foreground mb-4 mt-3">
        Upload a short video or paste a YouTube link to help referral partners get to know you.
      </p>

      {videoIntroUrl ? (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden border border-border bg-black">
            {isYouTube ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={videoIntroUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video Introduction"
                />
              </div>
            ) : (
              <video
                src={videoIntroUrl}
                controls
                className="w-full max-h-[360px]"
                preload="metadata"
              />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              className="h-8 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors inline-flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              Replace with Upload
            </button>
            <button
              onClick={() => {
                setShowYoutubeInput(true)
                setYoutubeUrlInput('')
                setVideoError('')
              }}
              className="h-8 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors inline-flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Replace with YouTube
            </button>
            <button
              onClick={handleVideoRemove}
              className="h-8 px-4 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
          <Video className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold mb-1">No video intro yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Upload a file (max 60s, 50MB) or paste a YouTube link
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo || !isAuthenticated}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
            >
              {uploadingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Upload Video
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowYoutubeInput(true)
                setYoutubeUrlInput('')
                setVideoError('')
              }}
              disabled={!isAuthenticated}
              className="h-9 px-5 rounded-lg border border-border font-bold text-sm hover:bg-accent transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Link2 className="w-3.5 h-3.5" />
              YouTube Link
            </button>
          </div>
        </div>
      )}

      {showYoutubeInput && (
        <div className="mt-3 p-4 rounded-lg border border-border bg-accent/30 space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">
            Paste a YouTube URL
          </label>
          <input
            type="url"
            value={youtubeUrlInput}
            onChange={(e) => setYoutubeUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleYouTubeSave}
              disabled={savingYoutubeUrl || !youtubeUrlInput.trim()}
              className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {savingYoutubeUrl ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save YouTube Video
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowYoutubeInput(false)
                setVideoError('')
              }}
              className="h-8 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {videoError && (
        <p className="text-xs text-red-500 font-semibold mt-2">{videoError}</p>
      )}

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
    </div>
  )
}
