import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * POST /api/social-media/publish
 * 
 * Publiziert oder scheduled ein Video auf Social Media Plattformen
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

    const { videoId, caption, platforms, scheduledAt, mediaUrl } = await request.json();

    if (!videoId || !caption) {
      return NextResponse.json(
        { error: 'Video ID und Caption sind erforderlich' },
        { status: 400 }
      );
    }

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', session.user.id)
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
      .eq('user_id', session.user.id)
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
        user_id: session.user.id,
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

