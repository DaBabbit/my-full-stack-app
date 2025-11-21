import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * GET /api/social-media/callback
 * 
 * Empfängt OAuth-Callback von Mixpost nach erfolgreicher Verbindung
 * 
 * Flow:
 * 1. Decode state → userId + platform extrahieren
 * 2. Alle Mixpost Accounts holen via API
 * 3. Neuesten Account der Platform finden (nach created_at sortiert)
 * 4. In Supabase speichern mit vollständigen Daten
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error from Mixpost
    if (error) {
      console.error('[social-media/callback] OAuth error from Mixpost:', error);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!state) {
      console.error('[social-media/callback] Missing state parameter');
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'invalid_callback');
      return NextResponse.redirect(redirectUrl);
    }

    // Decode state
    let stateData: { userId: string; platform: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('[social-media/callback] Decoded state:', { userId: stateData.userId, platform: stateData.platform });
    } catch (e) {
      console.error('[social-media/callback] Invalid state token:', e);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(redirectUrl);
    }

    const { userId, platform, timestamp } = stateData;

    // Validate timestamp (not older than 10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      console.error('[social-media/callback] State token expired');
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'token_expired');
      return NextResponse.redirect(redirectUrl);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all accounts from Mixpost
    console.log('[social-media/callback] Fetching all accounts from Mixpost...');
    let allAccounts;
    try {
      allAccounts = await mixpostClient.getAccounts();
      console.log('[social-media/callback] Fetched accounts count:', allAccounts.length);
    } catch (error) {
      console.error('[social-media/callback] Error fetching accounts from Mixpost:', error);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'fetch_accounts_failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Filter accounts by platform
    const platformAccounts = allAccounts.filter(acc => 
      acc.provider.toLowerCase() === platform.toLowerCase()
    );

    if (platformAccounts.length === 0) {
      console.error('[social-media/callback] No accounts found for platform:', platform);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'account_not_found');
      return NextResponse.redirect(redirectUrl);
    }

    // Find the newest account (most recently created)
    // Assumption: Mixpost returns accounts with a created_at field
    // If not available, we take the last one in the array
    const newestAccount = platformAccounts.reduce((newest, current) => {
      // If created_at exists, compare timestamps
      if (current.data?.created_at && newest.data?.created_at) {
        return new Date(current.data.created_at as string) > new Date(newest.data.created_at as string) 
          ? current 
          : newest;
      }
      // Fallback: return current (last one wins)
      return current;
    });

    console.log('[social-media/callback] Selected account:', {
      id: newestAccount.id,
      username: newestAccount.username,
      provider: newestAccount.provider
    });

    // Check if this Mixpost account is already connected to this user
    const { data: existingAccount } = await supabase
      .from('social_media_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('mixpost_account_id', newestAccount.id)
      .maybeSingle();

    if (existingAccount) {
      console.log('[social-media/callback] Account already exists, updating...');
      // Update existing account
      const { error: updateError } = await supabase
        .from('social_media_accounts')
        .update({
          platform_username: newestAccount.username,
          platform_user_id: newestAccount.data?.id as string || newestAccount.id,
          mixpost_account_data: newestAccount,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('[social-media/callback] Error updating account:', updateError);
        const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
        redirectUrl.searchParams.set('error', 'database_error');
        return NextResponse.redirect(redirectUrl);
      }
    } else {
      console.log('[social-media/callback] Inserting new account...');
      // Insert new account
      const { error: insertError } = await supabase
        .from('social_media_accounts')
        .insert({
          user_id: userId,
          platform: platform.toLowerCase(),
          mixpost_account_id: newestAccount.id,
          platform_username: newestAccount.username,
          platform_user_id: newestAccount.data?.id as string || newestAccount.id,
          mixpost_account_data: newestAccount,
          is_active: true
        });

      if (insertError) {
        console.error('[social-media/callback] Error inserting account:', insertError);
        const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
        redirectUrl.searchParams.set('error', 'database_error');
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Redirect to success page
    console.log('[social-media/callback] Success! Redirecting...');
    const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('platform', platform);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[social-media/callback] Unexpected error:', error);
    const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(redirectUrl);
  }
}
