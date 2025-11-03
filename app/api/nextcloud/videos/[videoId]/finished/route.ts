import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Liste fertige Videos im "Fertiges_Video" Ordner
 * 
 * Nutzt WebDAV PROPFIND um MP4-Dateien zu finden
 * Gibt Liste der verfügbaren Dateien zurück
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    // Environment Variables prüfen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Finished Videos API] Supabase Environment Variables fehlen');
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig' },
        { status: 500 }
      );
    }

    // Service-Role-Client erstellen
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // User authentifizieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Video abrufen mit nextcloud_path und storage_location
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, user_id, workspace_owner_id, nextcloud_path, storage_location')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video nicht gefunden' },
        { status: 404 }
      );
    }

    // Berechtigung prüfen
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

      const canView = membership?.permissions?.can_view || false;

      if (!canView) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für dieses Video' },
          { status: 403 }
        );
      }
    }

    // Pfad zum "Fertiges_Video" Ordner ableiten
    let basePath = '';
    
    // Bevorzugt: nextcloud_path verwenden
    if (video.nextcloud_path) {
      basePath = video.nextcloud_path.startsWith('/') 
        ? video.nextcloud_path.substring(1) 
        : video.nextcloud_path;
    } 
    // Fallback: Aus storage_location extrahieren
    else if (video.storage_location) {
      try {
        const storageUrl = new URL(video.storage_location);
        // Extrahiere Pfad aus URL (z.B. /apps/files/?dir=/path/to/folder)
        const dirMatch = storageUrl.searchParams.get('dir') || storageUrl.pathname;
        basePath = dirMatch.replace(/^\/+/, ''); // Remove leading slashes
      } catch (e) {
        console.error('[Finished Videos API] Fehler beim Parsen der storage_location:', e);
        return NextResponse.json(
          { error: 'Kein gültiger Speicherort vorhanden', files: [] },
          { status: 200 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Kein Speicherort für dieses Video', files: [] },
        { status: 200 }
      );
    }

    // Füge "Fertiges_Video" Ordner hinzu
    const finishedVideoPath = `${basePath}/Fertiges_Video`.replace(/\/+/g, '/');

    // Nextcloud Environment Variables
    const baseUrl = process.env.NEXTCLOUD_BASE_URL;
    const username = process.env.NEXTCLOUD_USERNAME;
    const password = process.env.NEXTCLOUD_APP_PASSWORD;
    const webdavPath = process.env.NEXTCLOUD_WEBDAV_PATH;

    if (!baseUrl || !username || !password || !webdavPath) {
      console.error('[Finished Videos API] Nextcloud Environment Variables fehlen');
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig' },
        { status: 500 }
      );
    }

    // WebDAV PROPFIND URL
    const propfindUrl = `${baseUrl}${webdavPath}/${finishedVideoPath}`;
    
    console.log('[Finished Videos API] PROPFIND URL:', propfindUrl);

    // PROPFIND Request
    const response = await fetch(propfindUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Depth': '1',
        'Content-Type': 'application/xml'
      }
    });

    if (!response.ok) {
      console.error('[Finished Videos API] PROPFIND fehlgeschlagen:', response.status);
      return NextResponse.json(
        { files: [], error: 'Ordner nicht gefunden oder leer' },
        { status: 200 }
      );
    }

    const xmlData = await response.text();
    
    // Parse XML und extrahiere MP4-Dateien
    const mp4Files = parsePropfindResponse(xmlData);

    return NextResponse.json({ 
      files: mp4Files,
      basePath: finishedVideoPath
    });

  } catch (error) {
    console.error('[Finished Videos API] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', files: [] },
      { status: 500 }
    );
  }
}

/**
 * Parst PROPFIND XML Response und extrahiert MP4-Dateien
 */
function parsePropfindResponse(xml: string): Array<{ filename: string; path: string; size?: number }> {
  const files: Array<{ filename: string; path: string; size?: number }> = [];
  
  // Einfaches Regex-basiertes Parsing (für Produktion: xml2js verwenden)
  // Suche nach <d:href> Tags die auf .mp4 enden
  const hrefRegex = /<d:href>([^<]*\.mp4[^<]*)<\/d:href>/gi;
  const matches = [...xml.matchAll(hrefRegex)];
  
  for (const match of matches) {
    const href = match[1];
    // Decode URL encoding
    const decodedHref = decodeURIComponent(href);
    
    // Extrahiere Dateinamen
    const parts = decodedHref.split('/');
    const filename = parts[parts.length - 1];
    
    // Skip den Ordner selbst
    if (!filename || filename.trim() === '') continue;
    
    // Extrahiere Dateigröße falls vorhanden
    const sizeMatch = xml.match(new RegExp(`<d:href>${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</d:href>[\\s\\S]*?<d:getcontentlength>(\\d+)</d:getcontentlength>`, 'i'));
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
    
    files.push({
      filename,
      path: decodedHref,
      size
    });
  }
  
  return files;
}

