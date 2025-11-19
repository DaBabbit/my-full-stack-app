import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Nextcloud Markdown File Read/Write
 * 
 * GET: Liest Video_Anforderungen.md aus Nextcloud via WebDAV
 * POST: Schreibt Markdown-Content in Video_Anforderungen.md
 */

const MARKDOWN_FILENAME = 'Video_Anforderungen.md';

/**
 * GET: Liest Markdown-Datei aus Nextcloud
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId ist erforderlich' },
        { status: 400 }
      );
    }

    // Authentifizierung
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert', details: authError },
        { status: 401 }
      );
    }

    // Video abrufen und Berechtigung prüfen
    const { video, error: videoError } = await getVideoWithPermissions(videoId, user.id);
    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video nicht gefunden oder keine Berechtigung', details: videoError },
        { status: 403 }
      );
    }

    // Nextcloud Path aus Video
    const nextcloudPath = video.nextcloud_path;
    if (!nextcloudPath) {
      return NextResponse.json(
        { error: 'Kein Nextcloud-Pfad für dieses Video vorhanden' },
        { status: 404 }
      );
    }

    // Nextcloud Credentials
    const credentials = getNextcloudCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Nextcloud-Konfiguration fehlt' },
        { status: 500 }
      );
    }

    // Construct WebDAV URL for markdown file
    const cleanPath = nextcloudPath.startsWith('/')
      ? nextcloudPath.substring(1)
      : nextcloudPath;
    const fileUrl = `${credentials.baseUrl}${credentials.webdavPath}/${cleanPath}/${MARKDOWN_FILENAME}`;

    // Read file via WebDAV
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
      },
    });

    if (response.status === 404) {
      // File doesn't exist yet - return empty content
      return NextResponse.json({
        content: '',
        exists: false
      });
    }

    if (!response.ok) {
      console.error('[Nextcloud Markdown] Read failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Fehler beim Lesen der Datei: ${response.statusText}` },
        { status: response.status }
      );
    }

    const content = await response.text();

    return NextResponse.json({
      content,
      exists: true
    });

  } catch (error) {
    console.error('[Nextcloud Markdown GET] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Schreibt Markdown-Content in Nextcloud-Datei
 */
export async function POST(request: Request) {
  try {
    const { videoId, content } = await request.json();

    if (!videoId || content === undefined) {
      return NextResponse.json(
        { error: 'videoId und content sind erforderlich' },
        { status: 400 }
      );
    }

    // Authentifizierung
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert', details: authError },
        { status: 401 }
      );
    }

    // Video abrufen und Berechtigung prüfen
    const { video, error: videoError } = await getVideoWithPermissions(videoId, user.id);
    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video nicht gefunden oder keine Berechtigung', details: videoError },
        { status: 403 }
      );
    }

    // Nextcloud Path aus Video
    const nextcloudPath = video.nextcloud_path;
    if (!nextcloudPath) {
      return NextResponse.json(
        { error: 'Kein Nextcloud-Pfad für dieses Video vorhanden' },
        { status: 404 }
      );
    }

    // Nextcloud Credentials
    const credentials = getNextcloudCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Nextcloud-Konfiguration fehlt' },
        { status: 500 }
      );
    }

    // Construct WebDAV URL for markdown file
    const cleanPath = nextcloudPath.startsWith('/')
      ? nextcloudPath.substring(1)
      : nextcloudPath;
    const fileUrl = `${credentials.baseUrl}${credentials.webdavPath}/${cleanPath}/${MARKDOWN_FILENAME}`;

    // Write file via WebDAV PUT
    const response = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
        'Content-Type': 'text/markdown; charset=utf-8',
      },
      body: content,
    });

    if (!response.ok) {
      console.error('[Nextcloud Markdown] Write failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Fehler beim Schreiben der Datei: ${response.statusText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Markdown-Datei erfolgreich gespeichert'
    });

  } catch (error) {
    console.error('[Nextcloud Markdown POST] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Authentifiziert User via Bearer Token
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
    return { user: null, error: error?.message || 'Authentifizierung fehlgeschlagen' };
  }

  return { user, error: null };
}

/**
 * Helper: Holt Video und prüft Berechtigung
 */
async function getVideoWithPermissions(videoId: string, userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { video: null, error: 'Supabase-Konfiguration fehlt' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Video abrufen
  const { data: video, error: videoError } = await supabaseAdmin
    .from('videos')
    .select('id, user_id, workspace_owner_id, nextcloud_path')
    .eq('id', videoId)
    .single();

  if (videoError || !video) {
    return { video: null, error: videoError?.message || 'Video nicht gefunden' };
  }

  // Berechtigung prüfen
  const isOwner = video.user_id === userId;
  const isWorkspaceMember = video.workspace_owner_id === userId;

  if (!isOwner && !isWorkspaceMember) {
    // Check ob User Collaborator ist
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('permissions')
      .eq('workspace_owner_id', video.workspace_owner_id || video.user_id)
      .eq('user_id', userId)
      .single();

    const canEdit = membership?.permissions?.can_edit || false;

    if (!canEdit) {
      return { video: null, error: 'Keine Berechtigung' };
    }
  }

  return { video, error: null };
}

/**
 * Helper: Holt Nextcloud Credentials aus Environment
 */
function getNextcloudCredentials() {
  const baseUrl = process.env.NEXTCLOUD_BASE_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_APP_PASSWORD;
  const webdavPath = process.env.NEXTCLOUD_WEBDAV_PATH;

  if (!baseUrl || !username || !password || !webdavPath) {
    console.error('[Nextcloud Markdown] Environment Variables fehlen');
    return null;
  }

  return {
    baseUrl,
    username,
    password,
    webdavPath
  };
}

