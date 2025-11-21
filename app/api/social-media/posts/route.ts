import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * GET /api/social-media/posts
 * 
 * Holt alle Social Media Posts des Users
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Get posts from database
    const { data: posts, error: dbError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('[social-media/posts] Database error:', dbError);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      posts: posts || []
    });
  } catch (error) {
    console.error('[social-media/posts] Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    );
  }
}

