import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/social-media/posts
 * 
 * Holt alle Social Media Posts des Users
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user via Bearer token
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get posts from database
    const { data: posts, error: dbError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('user_id', user.id)
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

/**
 * Helper: Authentifiziert User via Bearer Token
 */
async function authenticateUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { user: null, error: 'Supabase-Konfiguration fehlt' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Kein Authorization Header' };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || 'Ungültiger Token' };
  }

  return { user, error: null };
}
