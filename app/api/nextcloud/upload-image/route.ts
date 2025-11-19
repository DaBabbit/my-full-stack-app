import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadFileToNextcloud } from '@/lib/nextcloud-upload-server';

/**
 * Authenticate user from Authorization header
 */
async function authenticateUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { user: null, error: 'Supabase-Konfiguration fehlt' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Kein Authorization Header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || 'Ungültiger Token' };
  }

  return { user, error: null };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/nextcloud/upload-image - POST request');

    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Nicht autorisiert', details: authError },
        { status: 401 }
      );
    }
    
    console.log('[API] Session found for user:', user.id);

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

    // Create Supabase client for data queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, nextcloud_path, storage_location, user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('[API] Video not found:', videoError);
      return NextResponse.json(
        { error: 'Video nicht gefunden' },
        { status: 404 }
      );
    }

    // Check if user owns the video or has access
    if (video.user_id !== user.id) {
      console.error('[API] User does not own this video');
      return NextResponse.json(
        { error: 'Keine Berechtigung für dieses Video' },
        { status: 403 }
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

    // Create safe filename
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    console.log('[API] Uploading to Nextcloud path:', video.nextcloud_path);

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Nextcloud using server-side function
    await uploadFileToNextcloud(buffer, safeFileName, {
      targetPath: video.nextcloud_path,
      username,
      password,
      baseUrl,
      webdavPath,
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

