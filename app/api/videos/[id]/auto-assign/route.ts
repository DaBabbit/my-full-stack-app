import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';

/**
 * Automatische Zuständigkeitszuweisung bei Status-Änderung
 * POST /api/videos/[id]/auto-assign
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await context.params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newStatus, oldStatus } = await request.json();

    if (!newStatus) {
      return NextResponse.json({ error: 'Status erforderlich' }, { status: 400 });
    }

    console.log('[AutoAssign] Video:', videoId, 'Status:', oldStatus, '→', newStatus);

    // Hole Video-Details
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*, workspace_owner_id, responsible_person')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video nicht gefunden' }, { status: 404 });
    }

    // Automatische Zuständigkeitszuweisung basierend auf Status
    let newResponsiblePerson: string | null = null;
    let shouldNotify = false;
    
    // System-definierte Automatisierungen (immer aktiv)
    if (newStatus === 'In Bearbeitung (Schnitt)' || newStatus === 'Schnitt abgeschlossen' || newStatus === 'Hochgeladen') {
      // Automatisch kosmamedia zuweisen
      const { data: kosmamediaUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', '%kosmamedia%')
        .limit(1)
        .single();

      if (kosmamediaUser) {
        newResponsiblePerson = kosmamediaUser.id;
        shouldNotify = true;
        console.log('[AutoAssign] ✅ System-Automatisierung: kosmamedia zugewiesen');
      }
    } 
    // Benutzerdefinierte Automatisierungen für "Idee" und "Warten auf Aufnahme"
    else if (newStatus === 'Idee' || newStatus === 'Warten auf Aufnahme') {
      // Hole Automatisierungs-Einstellungen
      // Für eigene Videos: workspace_owner_id = user_id AND settings.workspace_owner_id IS NULL
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('automation_settings')
        .select('*')
        .eq('user_id', video.workspace_owner_id) // Der Owner der Videos
        .is('workspace_owner_id', null) // NULL = eigene Videos
        .maybeSingle();

      console.log('[AutoAssign] Settings query:', { 
        video_workspace_owner: video.workspace_owner_id, 
        settings, 
        error: settingsError 
      });

      if (settings) {
        if (newStatus === 'Idee' && settings.auto_assign_on_idea) {
          newResponsiblePerson = settings.auto_assign_on_idea;
          shouldNotify = true;
          console.log('[AutoAssign] ✅ Benutzer-Automatisierung: Idee → User', newResponsiblePerson);
        } else if (newStatus === 'Warten auf Aufnahme' && settings.auto_assign_on_waiting_for_recording) {
          newResponsiblePerson = settings.auto_assign_on_waiting_for_recording;
          shouldNotify = true;
          console.log('[AutoAssign] ✅ Benutzer-Automatisierung: Warten auf Aufnahme → User', newResponsiblePerson);
        }
      } else {
        console.log('[AutoAssign] ⚠️ Keine Automatisierungs-Einstellungen gefunden');
      }
    }

    // Update Video, wenn Zuständigkeit geändert werden soll
    if (newResponsiblePerson && newResponsiblePerson !== video.responsible_person) {
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({ 
          responsible_person: newResponsiblePerson,
          last_updated: new Date().toISOString()
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('[AutoAssign] Update-Fehler:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Benachrichtigung erstellen
      if (shouldNotify && newResponsiblePerson !== user.id) {
        const statusLabels: { [key: string]: string } = {
          'Idee': 'Idee',
          'Warten auf Aufnahme': 'Warten auf Aufnahme',
          'In Bearbeitung (Schnitt)': 'In Bearbeitung (Schnitt)',
          'Schnitt abgeschlossen': 'Schnitt abgeschlossen',
          'Hochgeladen': 'Hochgeladen'
        };

        await supabaseAdmin
          .from('responsibility_notifications')
          .insert({
            recipient_user_id: newResponsiblePerson,
            video_id: videoId,
            video_title: video.title,
            previous_responsible_person: video.responsible_person,
            new_responsible_person: newResponsiblePerson,
            status: newStatus,
            message: `Video "${video.title}" hat jetzt den Status "${statusLabels[newStatus] || newStatus}". Du wurdest als zuständige Person zugewiesen.`
          });

        console.log('[AutoAssign] ✅ Benachrichtigung erstellt für User:', newResponsiblePerson);
      }

      return NextResponse.json({ 
        success: true,
        assigned: true,
        newResponsiblePerson,
        notificationSent: shouldNotify && newResponsiblePerson !== user.id
      });
    }

    return NextResponse.json({ 
      success: true,
      assigned: false,
      message: 'Keine Automatisierung für diesen Status'
    });

  } catch (error) {
    console.error('[AutoAssign] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

