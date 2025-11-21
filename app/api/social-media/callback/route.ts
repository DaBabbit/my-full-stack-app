import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * GET /api/social-media/callback
 * 
 * Empfängt OAuth-Callback von Mixpost nach erfolgreicher Verbindung
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const accountId = searchParams.get('account_id'); // Mixpost should return this
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('[social-media/callback] OAuth error:', error);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!state || !accountId) {
      console.error('[social-media/callback] Missing state or account_id');
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'invalid_callback');
      return NextResponse.redirect(redirectUrl);
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
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

    // Get account details from Mixpost
    let accountDetails;
    try {
      accountDetails = await mixpostClient.getAccount(accountId);
    } catch (error) {
      console.error('[social-media/callback] Error fetching account from Mixpost:', error);
      const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'fetch_account_failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('social_media_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('mixpost_account_id', accountId)
      .single();

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabase
        .from('social_media_accounts')
        .update({
          platform_username: accountDetails.username,
          platform_user_id: accountDetails.data?.id as string,
          is_active: true,
          last_synced: new Date().toISOString()
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('[social-media/callback] Error updating account:', updateError);
      }
    } else {
      // Insert new account
      const { error: insertError } = await supabase
        .from('social_media_accounts')
        .insert({
          user_id: userId,
          platform: platform.toLowerCase(),
          mixpost_account_id: accountId,
          platform_username: accountDetails.username,
          platform_user_id: accountDetails.data?.id as string,
          is_active: true,
          last_synced: new Date().toISOString()
        });

      if (insertError) {
        console.error('[social-media/callback] Error inserting account:', insertError);
        const redirectUrl = new URL('/profile/social-media', request.nextUrl.origin);
        redirectUrl.searchParams.set('error', 'database_error');
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Redirect to success page
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
