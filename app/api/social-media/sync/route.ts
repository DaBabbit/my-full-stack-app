import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * POST /api/social-media/sync
 * 
 * Synchronisiert Analytics-Daten von Mixpost
 */
export async function POST(request: NextRequest) {
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

    // Get all posts for this user
    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'published');

    if (postsError) {
      console.error('[social-media/sync] Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Posts' },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Keine Posts zum Synchronisieren'
      });
    }

    // Sync analytics for each post
    let syncedCount = 0;
    for (const post of posts) {
      if (!post.mixpost_post_id) continue;

      try {
        const analytics = await mixpostClient.getPostAnalytics(post.mixpost_post_id);
        
        if (analytics) {
          await supabase
            .from('social_media_posts')
            .update({
              impressions: analytics.impressions || 0,
              engagement: analytics.engagement || 0,
              clicks: analytics.clicks || 0
            })
            .eq('id', post.id);
          
          syncedCount++;
        }
      } catch (error) {
        console.error(`[social-media/sync] Error syncing post ${post.id}:`, error);
        // Continue with next post
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      totalPosts: posts.length
    });
  } catch (error) {
    console.error('[social-media/sync] Error:', error);
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
