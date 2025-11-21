import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/social-media/connect
 * 
 * Initiiert OAuth-Flow für Social Media Platform über Mixpost
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

    const { platform } = await request.json();

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform ist erforderlich' },
        { status: 400 }
      );
    }

    // Supported platforms
    const supportedPlatforms = ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin', 'twitter'];
    if (!supportedPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { error: `Platform ${platform} wird nicht unterstützt` },
        { status: 400 }
      );
    }

    // Generate state token for OAuth callback
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: platform.toLowerCase(),
      timestamp: Date.now()
    })).toString('base64');

    // Mixpost OAuth URL
    // Default to production server: http://188.245.34.21:8082
    const mixpostUrl = process.env.MIXPOST_URL || 'http://188.245.34.21:8082';
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social-media/callback`;
    
    console.log('[social-media/connect] Mixpost URL:', mixpostUrl);
    console.log('[social-media/connect] Callback URL:', callbackUrl);
    
    // Build OAuth URL - This assumes Mixpost has an OAuth endpoint
    // Note: Actual endpoint may vary based on Mixpost version
    const oauthUrl = `${mixpostUrl}/connect/${platform}?` +
      `state=${encodeURIComponent(state)}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}`;

    return NextResponse.json({
      success: true,
      authUrl: oauthUrl,
      state
    });
  } catch (error) {
    console.error('[social-media/connect] Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Starten des OAuth-Flows' },
      { status: 500 }
    );
  }
}

