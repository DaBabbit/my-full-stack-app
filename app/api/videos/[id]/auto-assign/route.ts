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

    const body = await request.json();
    const { newStatus, oldStatus } = body;

    console.log('[AutoAssign] 📥 Request received:', { 
      videoId, 
      newStatus, 
      oldStatus,
      userId: user.id,
      userEmail: user.email 
    });

    if (!newStatus) {
      console.log('[AutoAssign] ❌ Missing status');
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
    
    console.log('[AutoAssign] 🔍 Checking automation rules for status:', newStatus);
    
    // 🔒 HART-KODIERT: System-definierte Automatisierungen (immer aktiv)
    // Diese Status-Übergänge weisen IMMER kosmamedia zu
    if (newStatus === 'In Bearbeitung (Schnitt)' || newStatus === 'Schnitt abgeschlossen' || newStatus === 'Hochgeladen') {
      console.log('[AutoAssign] 🔧 System automation triggered for status:', newStatus);
      
      // Nutze feste kosmamedia User ID
      const KOSMAMEDIA_USER_ID = process.env.NEXT_PUBLIC_KOSMAMEDIA_USER_ID || '00000000-1111-2222-3333-444444444444';
      
      newResponsiblePerson = KOSMAMEDIA_USER_ID;
      shouldNotify = true;
      console.log('[AutoAssign] ✅ System-Automatisierung (hart-kodiert): kosmamedia zugewiesen:', KOSMAMEDIA_USER_ID);
    } 
    // Benutzerdefinierte Automatisierungen für "Idee" und "Warten auf Aufnahme"
    else if (newStatus === 'Idee' || newStatus === 'Warten auf Aufnahme') {
      console.log('[AutoAssign] 🔧 User automation triggered for status:', newStatus);
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
        } else {
          console.log('[AutoAssign] ℹ️ Keine Automatisierung für Status:', newStatus);
        }
      } else {
        console.log('[AutoAssign] ⚠️ Keine Automatisierungs-Einstellungen gefunden für workspace_owner:', video.workspace_owner_id);
      }
    } else {
      console.log('[AutoAssign] ℹ️ Kein Automatisierungs-Regel für Status:', newStatus);
    }

    // Update Video, wenn Zuständigkeit geändert werden soll
    console.log('[AutoAssign] 🔍 Checking if assignment needed:', { 
      newResponsiblePerson, 
      currentResponsiblePerson: video.responsible_person,
      willUpdate: newResponsiblePerson && newResponsiblePerson !== video.responsible_person
    });

    if (newResponsiblePerson && newResponsiblePerson !== video.responsible_person) {
      console.log('[AutoAssign] ✏️ Updating video responsible_person to:', newResponsiblePerson);
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({ 
          responsible_person: newResponsiblePerson,
          last_updated: new Date().toISOString()
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('[AutoAssign] ❌ Update-Fehler:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log('[AutoAssign] ✅ Video updated successfully');

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
      } else {
        console.log('[AutoAssign] ℹ️ Keine Benachrichtigung nötig (User ist selbst zuständig oder shouldNotify=false)');
      }

      // Person Name für Toast Notification holen
      const { data: assignedUser } = await supabaseAdmin
        .from('users')
        .select('firstname, lastname, email')
        .eq('id', newResponsiblePerson)
        .single();
      
      let assignedPersonName = 'Unbekannt';
      if (assignedUser) {
        if (assignedUser.email?.toLowerCase().includes('kosmamedia')) {
          assignedPersonName = 'kosmamedia';
        } else if (assignedUser.firstname && assignedUser.lastname) {
          assignedPersonName = `${assignedUser.firstname} ${assignedUser.lastname}`;
        } else {
          assignedPersonName = assignedUser.email?.split('@')[0] || 'Unbekannt';
        }
      }

      console.log('[AutoAssign] 🎉 Auto-assignment completed successfully');

      return NextResponse.json({ 
        success: true,
        assigned: true,
        assignedTo: newResponsiblePerson,
        assignedPersonName, // Name für Toast
        newResponsiblePerson, // Keep for backward compatibility
        notificationSent: shouldNotify && newResponsiblePerson !== user.id
      });
    }

    console.log('[AutoAssign] ℹ️ No assignment needed - returning success with assigned=false');

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

