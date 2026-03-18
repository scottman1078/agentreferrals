-- ═══════════════════════════════════════════════════════════════
-- Storage bucket for video uploads (intros + bid pitches)
-- ═══════════════════════════════════════════════════════════════

-- Create the videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true, -- public access for playback
  104857600, -- 100MB max
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage Policies ──────────────────────────────────────────

-- Anyone can read videos (public bucket)
CREATE POLICY "videos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'videos');

-- Authenticated users can upload to their own folder
CREATE POLICY "videos_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own videos
CREATE POLICY "videos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own videos
CREATE POLICY "videos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
