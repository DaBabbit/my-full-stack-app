import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/utils/supabase';
import { supabaseAdmin } from '@/utils/supabase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { ownerId: string } }
) {
  try {
    const { ownerId } = params;
    
    // Authenticate the current user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create videos in this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('permissions')
      .eq('workspace_owner_id', ownerId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    // Check for can_create permission
    const permissions = membership.permissions as { can_create?: boolean };
    if (!permissions.can_create) {
      return NextResponse.json({ error: 'No permission to create videos' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { title, status, publication_date, responsible_person, inspiration_source, description } = body;

    // Create video using admin client to bypass RLS
    const { data: video, error: createError } = await supabaseAdmin
      .from('videos')
      .insert([
        {
          user_id: ownerId,
          workspace_owner_id: ownerId,
          title,
          status: status || 'Idee',
          publication_date: publication_date || null,
          responsible_person: responsible_person || null,
          storage_location: null,
          inspiration_source: inspiration_source || null,
          description: description || null,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating video:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

