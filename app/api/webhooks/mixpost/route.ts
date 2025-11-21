import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/webhooks/mixpost
 * 
 * Empfängt Webhooks von Mixpost für Real-time Updates
 * Note: No authentication required for webhooks (should use signature verification in production)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('[webhooks/mixpost] Received webhook:', payload);

    const { event, data } = payload;

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different webhook events
    switch (event) {
      case 'post.published': {
        // Update post status to published
        const { post_id, published_at, url } = data;
        
        const { error } = await supabase
          .from('social_media_posts')
          .update({
            status: 'published',
            published_at: published_at || new Date().toISOString(),
            post_url: url
          })
          .eq('mixpost_post_id', post_id);

        if (error) {
          console.error('[webhooks/mixpost] Error updating post status:', error);
        } else {
          console.log(`[webhooks/mixpost] Post ${post_id} marked as published`);
        }
        break;
      }

      case 'post.failed': {
        // Update post status to failed with error message
        const { post_id, error: errorMessage } = data;
        
        const { error } = await supabase
          .from('social_media_posts')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('mixpost_post_id', post_id);

        if (error) {
          console.error('[webhooks/mixpost] Error updating failed post:', error);
        } else {
          console.log(`[webhooks/mixpost] Post ${post_id} marked as failed`);
        }
        break;
      }

      case 'post.scheduled': {
        // Update post status to scheduled
        const { post_id, scheduled_at } = data;
        
        const { error } = await supabase
          .from('social_media_posts')
          .update({
            status: 'scheduled',
            scheduled_at: scheduled_at
          })
          .eq('mixpost_post_id', post_id);

        if (error) {
          console.error('[webhooks/mixpost] Error updating scheduled post:', error);
        } else {
          console.log(`[webhooks/mixpost] Post ${post_id} scheduled for ${scheduled_at}`);
        }
        break;
      }

      case 'account.added': {
        // Sync new account from Mixpost
        const { account_id, provider, username, user_id } = data;
        
        // Check if account already exists
        const { data: existing } = await supabase
          .from('social_media_accounts')
          .select('id')
          .eq('mixpost_account_id', account_id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('social_media_accounts')
            .insert({
              user_id: user_id,
              platform: provider.toLowerCase(),
              mixpost_account_id: account_id,
              platform_username: username,
              is_active: true,
              last_synced: new Date().toISOString()
            });

          if (error) {
            console.error('[webhooks/mixpost] Error syncing new account:', error);
          } else {
            console.log(`[webhooks/mixpost] Account ${account_id} synced`);
          }
        }
        break;
      }

      case 'account.disconnected': {
        // Mark account as inactive
        const { account_id } = data;
        
        const { error } = await supabase
          .from('social_media_accounts')
          .update({ is_active: false })
          .eq('mixpost_account_id', account_id);

        if (error) {
          console.error('[webhooks/mixpost] Error deactivating account:', error);
        } else {
          console.log(`[webhooks/mixpost] Account ${account_id} deactivated`);
        }
        break;
      }

      default:
        console.log(`[webhooks/mixpost] Unknown event: ${event}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    console.error('[webhooks/mixpost] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
