import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

/**
 * API Route: Nextcloud WebDAV Credentials
 * 
 * Gibt sichere WebDAV-Credentials zurück für Client-seitige Uploads
 * Credentials werden nur an authentifizierte User ausgegeben
 */
export async function POST(request: Request) {
  try {
    const { videoId, nextcloudPath } = await request.json();

    // Validierung
    if (!videoId || !nextcloudPath) {
      return NextResponse.json(
        { error: 'videoId und nextcloudPath sind erforderlich' },
        { status: 400 }
      );
    }

    // User authentifizieren - Token aus Request Header lesen
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert - kein Auth Header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Verifiziere dass User Zugriff auf das Video hat
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id, workspace_owner_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video nicht gefunden' },
        { status: 404 }
      );
    }

    // Check: User ist Owner oder hat Workspace-Zugriff
    const isOwner = video.user_id === user.id;
    const isWorkspaceMember = video.workspace_owner_id === user.id;

    if (!isOwner && !isWorkspaceMember) {
      // Check ob User Collaborator ist
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('permissions')
        .eq('workspace_owner_id', video.workspace_owner_id || video.user_id)
        .eq('user_id', user.id)
        .single();

      const canEdit = membership?.permissions?.can_edit || false;

      if (!canEdit) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für dieses Video' },
          { status: 403 }
        );
      }
    }

    // Environment Variables prüfen
    const baseUrl = process.env.NEXTCLOUD_BASE_URL;
    const username = process.env.NEXTCLOUD_USERNAME;
    const password = process.env.NEXTCLOUD_APP_PASSWORD;
    const webdavPath = process.env.NEXTCLOUD_WEBDAV_PATH;

    if (!baseUrl || !username || !password || !webdavPath) {
      console.error('Nextcloud Environment Variables fehlen!');
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig' },
        { status: 500 }
      );
    }

    // Bereinige nextcloudPath (remove leading slash if present)
    const cleanPath = nextcloudPath.startsWith('/') 
      ? nextcloudPath.substring(1) 
      : nextcloudPath;

    // WebDAV URL konstruieren
    const webdavUrl = `${baseUrl}${webdavPath}/${cleanPath}`;

    // Credentials zurückgeben
    return NextResponse.json({
      webdavUrl,
      username,
      password,
      baseUrl
    });

  } catch (error) {
    console.error('[Nextcloud Credentials API] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

