import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';

/**
 * Trigger für Automatisierung nach Datei-Upload
 * POST /api/automation/trigger
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, allFilesUploaded } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID erforderlich' }, { status: 400 });
    }

    console.log('[Automation] Trigger für Video:', videoId, 'Alle Dateien hochgeladen:', allFilesUploaded);

    // Hole Video-Details
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*, workspace_owner_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video nicht gefunden' }, { status: 404 });
    }

    // Prüfe Berechtigung
    const isOwner = video.user_id === user.id;
    const isWorkspaceMember = video.workspace_owner_id && video.workspace_owner_id !== user.id;

    if (!isOwner && isWorkspaceMember) {
      // Prüfe Workspace-Mitgliedschaft
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('permissions')
        .eq('workspace_owner_id', video.workspace_owner_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      const permissions = membership?.permissions as { can_edit?: boolean } | null;
      if (!membership || !permissions?.can_edit) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    const updates: { status?: string; responsible_person?: string; last_updated?: string } = {};
    let notificationMessage = '';
    const previousResponsible = video.responsible_person;

    // Automatisierung: Alle Dateien hochgeladen → Status "In Bearbeitung"
    if (allFilesUploaded) {
      updates.status = 'In Bearbeitung';
      
      // Automatische Zuständigkeit: kosmamedia
      // Suche kosmamedia User
      const { data: kosmamediaUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', '%kosmamedia%')
        .limit(1)
        .single();

      if (kosmamediaUser) {
        updates.responsible_person = kosmamediaUser.id;
        notificationMessage = `Video "${video.title}" ist nun in Bearbeitung. Du wurdest als zuständige Person zugewiesen.`;
      }

      updates.last_updated = new Date().toISOString();
    }

    // Update Video
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update(updates)
      .eq('id', videoId);

    if (updateError) {
      console.error('[Automation] Update-Fehler:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Benachrichtigung erstellen, wenn Zuständigkeit geändert wurde
    if (updates.responsible_person && updates.responsible_person !== previousResponsible) {
      await supabaseAdmin
        .from('responsibility_notifications')
        .insert({
          recipient_user_id: updates.responsible_person,
          video_id: videoId,
          video_title: video.title,
          previous_responsible_person: previousResponsible,
          new_responsible_person: updates.responsible_person,
          status: updates.status,
          message: notificationMessage
        });

      console.log('[Automation] ✅ Benachrichtigung erstellt für User:', updates.responsible_person);
    }

    console.log('[Automation] ✅ Video aktualisiert:', videoId, updates);

    return NextResponse.json({ 
      success: true, 
      updates,
      notificationSent: !!updates.responsible_person
    });

  } catch (error) {
    console.error('[Automation] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

