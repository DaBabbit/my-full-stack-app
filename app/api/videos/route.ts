import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
  try {
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch videos for the current user only (RLS will enforce this automatically)
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        status,
        publication_date,
        responsible_person,
        storage_location,
        inspiration_source,
        description,
        created_at,
        last_updated
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    // Transform data to match frontend interface
    const transformedVideos = videos?.map(video => ({
      id: video.id,
      name: video.title, // Map title to name for backwards compatibility
      status: video.status,
      storage_location: video.storage_location,
      created_at: video.created_at,
      // Include additional fields for future use
      publication_date: video.publication_date,
      responsible_person: video.responsible_person,
      inspiration_source: video.inspiration_source,
      description: video.description,
      last_updated: video.last_updated
    })) || [];

    return NextResponse.json(transformedVideos);
  } catch (error) {
    console.error('Unexpected error in GET /api/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      title, 
      status, 
      publication_date, 
      responsible_person, 
      storage_location, 
      inspiration_source, 
      description 
    } = body;

    // Use title if provided, otherwise use name for backwards compatibility
    const videoTitle = title || name;

    if (!videoTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Insert new video
    const { data: video, error } = await supabase
      .from('videos')
      .insert([
        {
          user_id: user.id,
          title: videoTitle,
          status: status || 'Idee',
          publication_date,
          responsible_person,
          storage_location,
          inspiration_source,
          description
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating video:', error);
      return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
    }

    // Transform response to match frontend interface
    const transformedVideo = {
      id: video.id,
      name: video.title,
      status: video.status,
      storage_location: video.storage_location,
      created_at: video.created_at,
      publication_date: video.publication_date,
      responsible_person: video.responsible_person,
      inspiration_source: video.inspiration_source,
      description: video.description,
      last_updated: video.last_updated
    };

    return NextResponse.json(transformedVideo, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, 
      name, 
      title, 
      status, 
      publication_date, 
      responsible_person, 
      storage_location, 
      inspiration_source, 
      description 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    
    if (title || name) {
      updateData.title = title || name;
    }
    if (status) {
      updateData.status = status;
    }
    if (publication_date !== undefined) {
      updateData.publication_date = publication_date;
    }
    if (responsible_person !== undefined) {
      updateData.responsible_person = responsible_person;
    }
    if (storage_location !== undefined) {
      updateData.storage_location = storage_location;
    }
    if (inspiration_source !== undefined) {
      updateData.inspiration_source = inspiration_source;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    // Update video (RLS will ensure user can only update their own videos)
    const { data: video, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating video:', error);
      return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
    }

    if (!video) {
      return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 });
    }

    // Transform response to match frontend interface
    const transformedVideo = {
      id: video.id,
      name: video.title,
      status: video.status,
      storage_location: video.storage_location,
      created_at: video.created_at,
      publication_date: video.publication_date,
      responsible_person: video.responsible_person,
      inspiration_source: video.inspiration_source,
      description: video.description,
      last_updated: video.last_updated
    };

    return NextResponse.json(transformedVideo);
  } catch (error) {
    console.error('Unexpected error in PUT /api/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Delete video (RLS will ensure user can only delete their own videos)
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting video:', error);
      return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
