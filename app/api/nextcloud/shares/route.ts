import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Erstelle Nextcloud Share-Link
 * 
 * Nutzt Nextcloud OCS Share API (shareType=3 für öffentliche Links)
 * Gibt Download-URL für direktes Streaming zurück
 */
export async function POST(request: Request) {
  try {
    const { videoId, filename } = await request.json();

    if (!videoId || !filename) {
      return NextResponse.json(
        { error: 'videoId und filename sind erforderlich' },
        { status: 400 }
      );
    }

    // Environment Variables prüfen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Video abrufen
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

    // Pfad ableiten
    let basePath = '';
    
    if (video.nextcloud_path) {
      basePath = video.nextcloud_path.startsWith('/') 
        ? video.nextcloud_path.substring(1) 
        : video.nextcloud_path;
    } else if (video.storage_location) {
      try {
        const storageUrl = new URL(video.storage_location);
        const dirMatch = storageUrl.searchParams.get('dir') || storageUrl.pathname;
        basePath = dirMatch.replace(/^\/+/, '');
      } catch {
        return NextResponse.json(
          { error: 'Kein gültiger Speicherort vorhanden' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Kein Speicherort für dieses Video' },
        { status: 400 }
      );
    }

    // Vollständiger Pfad zur Datei
    const fullPath = `${basePath}/Fertiges_Video/${filename}`.replace(/\/+/g, '/');

    // Nextcloud Environment Variables
    const baseUrl = process.env.NEXTCLOUD_BASE_URL;
    const username = process.env.NEXTCLOUD_USERNAME;
    const password = process.env.NEXTCLOUD_APP_PASSWORD;

    if (!baseUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig' },
        { status: 500 }
      );
    }

    // Prüfe ob bereits ein Share existiert für diesen Pfad
    const existingShare = await getExistingShare(baseUrl, username, password, fullPath);
    
    if (existingShare) {
      console.log('[Share API] Bestehender Share gefunden:', existingShare.token);
      return NextResponse.json({
        shareUrl: existingShare.url,
        streamUrl: existingShare.streamUrl, // Für Video-Player (mit /download)
        downloadUrl: existingShare.downloadUrl, // Für Download-Button (mit /download)
        token: existingShare.token,
        cached: true
      });
    }

    // Erstelle neuen Share via OCS API
    const ocsUrl = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
    
    // FormData für OCS API
    const formData = new URLSearchParams();
    formData.append('path', `/${fullPath}`);
    formData.append('shareType', '3'); // Public link
    formData.append('permissions', '1'); // Read only

    const shareResponse = await fetch(ocsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json' // Stelle sicher, dass wir JSON zurückbekommen
      },
      body: formData.toString()
    });

    if (!shareResponse.ok) {
      const errorText = await shareResponse.text();
      console.error('[Share API] Fehler beim Erstellen des Shares:', shareResponse.status, errorText);
      return NextResponse.json(
        { error: `Share konnte nicht erstellt werden: ${shareResponse.status}` },
        { status: 500 }
      );
    }

    let shareData;
    try {
      shareData = await shareResponse.json();
    } catch (parseError) {
      const responseText = await shareResponse.text();
      console.error('[Share API] JSON Parse Fehler:', parseError, 'Response:', responseText);
      return NextResponse.json(
        { error: 'Ungültige Antwort von Nextcloud API' },
        { status: 500 }
      );
    }
    
    // OCS API gibt XML oder JSON zurück (abhängig von Accept Header)
    // Wir nutzen JSON Format
    if (shareData.ocs?.meta?.statuscode !== 200 && shareData.ocs?.meta?.status !== 'ok') {
      console.error('[Share API] OCS API Fehler:', shareData.ocs?.meta);
      return NextResponse.json(
        { error: `Share-Erstellung fehlgeschlagen: ${shareData.ocs?.meta?.message || 'Unbekannter Fehler'}` },
        { status: 500 }
      );
    }

    const share = shareData.ocs?.data;
    const shareUrl = share.url;
    const shareToken = share.token;
    
    // Für Video-Streaming: /download anhängen (laut Nextcloud-Dokumentation)
    // Format: https://cloud.example.com/s/token/download
    // Dies ermöglicht direktes Streaming mit korrektem Content-Type
    const streamUrl = `${shareUrl}/download`; // Für Video-Player (Streaming)
    const downloadUrl = `${shareUrl}/download`; // Für Download-Button (gleiche URL)

    console.log('[Share API] Share erfolgreich erstellt:', shareToken);
    console.log('[Share API] Share URL:', shareUrl);
    console.log('[Share API] Stream URL:', streamUrl);
    console.log('[Share API] Download URL:', downloadUrl);

    return NextResponse.json({
      shareUrl,
      streamUrl, // Für Video-Player (mit /download)
      downloadUrl, // Für Download-Button (mit /download)
      token: shareToken,
      cached: false
    });

  } catch (error) {
    console.error('[Share API] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

/**
 * Prüft ob bereits ein Share für den gegebenen Pfad existiert
 */
async function getExistingShare(
  baseUrl: string,
  username: string,
  password: string,
  path: string
): Promise<{ url: string; streamUrl: string; downloadUrl: string; token: string } | null> {
  try {
    const ocsUrl = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(`/${path}`)}&format=json`;
    
    const response = await fetch(ocsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'OCS-APIRequest': 'true',
        'Accept': 'application/json' // Stelle sicher, dass wir JSON zurückbekommen
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.ocs?.meta?.status !== 'ok' || !data.ocs?.data || data.ocs.data.length === 0) {
      return null;
    }

    // Finde den ersten öffentlichen Share (shareType 3)
    const publicShare = data.ocs.data.find((share: { share_type: number; url: string; token: string }) => share.share_type === 3);
    
    if (!publicShare) {
      return null;
    }

    return {
      url: publicShare.url,
      streamUrl: `${publicShare.url}/download`, // Für Video-Player (mit /download)
      downloadUrl: `${publicShare.url}/download`, // Für Download (mit /download)
      token: publicShare.token
    };

  } catch (error) {
    console.error('[Share API] Fehler beim Prüfen bestehender Shares:', error);
    return null;
  }
}

