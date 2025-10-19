import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Environment Variables prüfen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Nextcloud API] Supabase Environment Variables fehlen');
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig' },
        { status: 500 }
      );
    }

    // Erstelle Service-Role-Client (umgeht RLS, funktioniert in Edge Functions)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // User authentifizieren - Token aus Request Header lesen
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Nextcloud API] Kein Authorization Header gefunden');
      return NextResponse.json(
        { error: 'Nicht authentifiziert - kein Auth Header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[Nextcloud API] Auth-Fehler:', authError);
      return NextResponse.json(
        { error: 'Nicht authentifiziert', details: authError?.message },
        { status: 401 }
      );
    }
    
    console.log('[Nextcloud API] ✅ User authentifiziert:', user.id);
    console.log('[Nextcloud API] 🔍 Suche Video mit ID:', videoId);

    // Verifiziere dass User Zugriff auf das Video hat
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, user_id, workspace_owner_id')
      .eq('id', videoId)
      .single();

    console.log('[Nextcloud API] Video Query Result:', { video, videoError });

    if (videoError || !video) {
      console.error('[Nextcloud API] ❌ Video nicht gefunden oder Fehler:', videoError);
      return NextResponse.json(
        { error: 'Video nicht gefunden', details: videoError?.message },
        { status: 404 }
      );
    }
    
    console.log('[Nextcloud API] ✅ Video gefunden:', video.id);

    // Check: User ist Owner oder hat Workspace-Zugriff
    const isOwner = video.user_id === user.id;
    const isWorkspaceMember = video.workspace_owner_id === user.id;

    if (!isOwner && !isWorkspaceMember) {
      // Check ob User Collaborator ist
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('permissions')
        .eq('workspace_owner_id', video.workspace_owner_id || video.user_id)
        .eq('user_id', user.id)
        .single();

      const canEdit = membership?.permissions?.can_edit || false;

      if (!canEdit) {
        console.log('[Nextcloud API] ❌ Keine Berechtigung für User:', user.id);
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
    const uploadsPath = process.env.NEXTCLOUD_UPLOADS_PATH;

    if (!baseUrl || !username || !password || !webdavPath || !uploadsPath) {
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

    // WebDAV URLs konstruieren
    const webdavUrl = `${baseUrl}${webdavPath}/${cleanPath}`;
    const uploadsUrl = `${baseUrl}${uploadsPath}`;

    // Credentials zurückgeben
    return NextResponse.json({
      webdavUrl,
      uploadsUrl,
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

