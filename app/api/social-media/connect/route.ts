import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/social-media/connect
 * 
 * Initiiert OAuth-Flow für Social Media Platform über Mixpost
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
      userId: user.id,
      platform: platform.toLowerCase(),
      timestamp: Date.now()
    })).toString('base64');

    // Mixpost OAuth URL
    // Default to production server: http://188.245.34.21:8082
    const mixpostUrl = process.env.MIXPOST_URL || 'http://188.245.34.21:8082';
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social-media/callback`;
    
    console.log('[social-media/connect] Mixpost URL:', mixpostUrl);
    console.log('[social-media/connect] Callback URL:', callbackUrl);
    
    // Build OAuth URL for Mixpost
    // Mixpost Pro uses /mixpost as MIXPOST_CORE_PATH (default)
    // OAuth endpoints: /mixpost/oauth/{platform}
    const mixpostCorePath = process.env.MIXPOST_CORE_PATH || 'mixpost';
    const oauthUrl = `${mixpostUrl}/${mixpostCorePath}/oauth/${platform}?` +
      `state=${encodeURIComponent(state)}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}`;

    console.log('[social-media/connect] Generated OAuth URL:', oauthUrl);

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

