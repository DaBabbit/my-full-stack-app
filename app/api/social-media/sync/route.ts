import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * POST /api/social-media/sync
 * 
 * Synchronisiert Analytics-Daten von Mixpost
 */
export async function POST(request: NextRequest) {
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

    // Get all posts for this user
    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('user_id', session.user.id)
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

