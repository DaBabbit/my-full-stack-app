import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { uploadFile } from '@/lib/nextcloud-upload';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/nextcloud/upload-image - POST request');

    // Get user session
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('[API] No active session');
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const videoId = formData.get('videoId') as string;

    if (!file) {
      console.error('[API] No file provided');
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    if (!videoId) {
      console.error('[API] No videoId provided');
      return NextResponse.json(
        { error: 'Keine Video-ID angegeben' },
        { status: 400 }
      );
    }

    console.log('[API] Uploading image:', file.name, 'for video:', videoId);

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, nextcloud_path, storage_location')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('[API] Video not found:', videoError);
      return NextResponse.json(
        { error: 'Video nicht gefunden' },
        { status: 404 }
      );
    }

    if (!video.nextcloud_path) {
      console.error('[API] No nextcloud_path for video');
      return NextResponse.json(
        { error: 'Kein Nextcloud-Pfad vorhanden' },
        { status: 400 }
      );
    }

    // Nextcloud configuration
    const baseUrl = process.env.NEXTCLOUD_BASE_URL;
    const webdavPath = process.env.NEXTCLOUD_WEBDAV_PATH;
    const uploadsPath = process.env.NEXTCLOUD_UPLOADS_PATH;
    const username = process.env.NEXTCLOUD_USERNAME;
    const password = process.env.NEXTCLOUD_APP_PASSWORD;

    if (!baseUrl || !webdavPath || !uploadsPath || !username || !password) {
      console.error('[API] Missing Nextcloud credentials');
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    const webdavUrl = baseUrl + webdavPath;
    const uploadsUrl = baseUrl + uploadsPath;

    // Create safe filename
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const targetPath = `${video.nextcloud_path}/${safeFileName}`;

    console.log('[API] Uploading to Nextcloud path:', targetPath);

    // Upload to Nextcloud
    await uploadFile(file, {
      webdavUrl,
      uploadsUrl,
      username,
      password,
    });

    console.log('[API] Image uploaded successfully');

    // Generate image URL (storage_location + filename)
    const imageUrl = `${video.storage_location}/${safeFileName}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName: safeFileName,
    });

  } catch (error) {
    console.error('[API] Error uploading image:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Hochladen des Bildes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

