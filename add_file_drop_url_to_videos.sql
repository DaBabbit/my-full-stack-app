-- Migration: Add file_drop_url field to videos table
-- This field stores the Nextcloud File Drop URL for direct video file uploads

ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS file_drop_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_file_drop_url ON videos(file_drop_url);

-- Add comment to explain the field
COMMENT ON COLUMN videos.file_drop_url IS 'Nextcloud File Drop URL for uploading video files (write-only access)';
COMMENT ON COLUMN videos.storage_location IS 'Nextcloud folder URL for browsing uploaded files (read access)';

