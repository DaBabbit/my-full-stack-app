import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * POST /api/social-media/publish
 * 
 * Publiziert oder scheduled ein Video auf Social Media Plattformen
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

    const { videoId, caption, platforms, scheduledAt, mediaUrl } = await request.json();

    if (!videoId || !caption) {
      return NextResponse.json(
        { error: 'Video ID und Caption sind erforderlich' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video nicht gefunden' },
        { status: 404 }
      );
    }

    // Get user's connected accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Accounts' },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Keine verbundenen Social Media Accounts gefunden' },
        { status: 400 }
      );
    }

    // Filter accounts by requested platforms (if specified)
    let targetAccounts = accounts;
    if (platforms && platforms.length > 0) {
      targetAccounts = accounts.filter(acc => 
        platforms.includes(acc.platform)
      );
    }

    if (targetAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Keine passenden Accounts für die gewählten Plattformen' },
        { status: 400 }
      );
    }

    // Upload media to Mixpost if mediaUrl provided
    let mixpostMediaId: string | undefined;
    if (mediaUrl || video.storage_location) {
      try {
        const videoUrl = mediaUrl || video.storage_location;
        const filename = video.title ? `${video.title}.mp4` : 'video.mp4';
        const media = await mixpostClient.uploadMediaFromUrl(videoUrl, filename);
        mixpostMediaId = media.id;
      } catch (error) {
        console.error('[social-media/publish] Error uploading media:', error);
        return NextResponse.json(
          { error: 'Fehler beim Hochladen des Videos' },
          { status: 500 }
        );
      }
    }

    // Create post in Mixpost
    const accountIds = targetAccounts.map(acc => acc.mixpost_account_id);
    
    try {
      const mixpostPost = await mixpostClient.createPost({
        content: caption,
        accounts: accountIds,
        media: mixpostMediaId ? [mixpostMediaId] : undefined,
        scheduled_at: scheduledAt || undefined
      });

      // Save post records in database for each platform
      const postRecords = targetAccounts.map(account => ({
        video_id: videoId,
        user_id: user.id,
        mixpost_post_id: mixpostPost.id,
        platform: account.platform,
        status: scheduledAt ? 'scheduled' : 'publishing',
        caption: caption,
        scheduled_at: scheduledAt || new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('social_media_posts')
        .insert(postRecords);

      if (insertError) {
        console.error('[social-media/publish] Error saving posts:', insertError);
        // Don't fail the request, post was created in Mixpost
      }

      return NextResponse.json({
        success: true,
        mixpost_post_id: mixpostPost.id,
        platforms: targetAccounts.map(acc => acc.platform),
        scheduled_at: scheduledAt || null,
        message: scheduledAt 
          ? 'Video erfolgreich geplant' 
          : 'Video wird veröffentlicht'
      });
    } catch (error) {
      console.error('[social-media/publish] Error creating post in Mixpost:', error);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Posts' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[social-media/publish] Unexpected error:', error);
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
