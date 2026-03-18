import { createClient } from '@/lib/supabase/client'

/**
 * Upload a video file to Supabase Storage.
 * Files are stored under: videos/{userId}/{filename}
 * Returns the public URL of the uploaded video.
 */
export async function uploadVideo(
  userId: string,
  file: File,
  prefix: 'intro' | 'pitch' | 'interview' = 'intro'
): Promise<{ url: string; error: string | null }> {
  const supabase = createClient()
  if (!supabase) return { url: '', error: 'Supabase client not available' }

  const ext = file.name.split('.').pop() || 'mp4'
  const filename = `${prefix}-${Date.now()}.${ext}`
  const path = `${userId}/${filename}`

  const { error } = await supabase.storage
    .from('videos')
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    console.error('[uploadVideo] Error:', error)
    return { url: '', error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(path)

  return { url: publicUrl, error: null }
}
