import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { withCors } from '@/utils/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withCors(async function POST(request: NextRequest) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    console.log('[Reactivate] 🔄 Reactivating subscription:', subscriptionId);

    // Get current subscription from Stripe (SINGLE SOURCE OF TRUTH)
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('[Reactivate] 📊 Stripe Status:', currentSubscription.status);
    console.log('[Reactivate] 📊 Cancel at period end:', currentSubscription.cancel_at_period_end);
    console.log('[Reactivate] 📊 Current period end:', new Date(currentSubscription.current_period_end * 1000).toISOString());
    
    // Check if subscription is truly canceled in Stripe AND period has ended
    const currentPeriodEnd = new Date(currentSubscription.current_period_end * 1000);
    const now = new Date();
    const periodHasEnded = currentPeriodEnd < now;
    
    console.log('[Reactivate] 📅 Period end:', currentPeriodEnd.toISOString());
    console.log('[Reactivate] 📅 Now:', now.toISOString());
    console.log('[Reactivate] 📅 Period has ended:', periodHasEnded);
    
    if (currentSubscription.status === 'canceled' && periodHasEnded) {
      console.log('[Reactivate] ❌ Subscription is truly canceled and period has ended');
      
      // Sync Supabase to reflect reality
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          current_period_end: new Date(currentSubscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);
      
      return NextResponse.json(
        { error: 'Das Abonnement ist bereits abgelaufen und kann nicht wiederhergestellt werden. Bitte schließe ein neues Abo ab.' },
        { status: 400 }
      );
    }
    
    // If subscription is canceled but period hasn't ended, treat it as cancel_at_period_end
    if (currentSubscription.status === 'canceled' && !periodHasEnded) {
      console.log('[Reactivate] ⚠️ Subscription is marked canceled but period is still active');
      console.log('[Reactivate] 🔄 Treating as cancel_at_period_end and attempting to reactivate...');
      
      // Try to update the subscription to remove cancellation
      // Note: This might fail if Stripe has truly canceled it
      try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false
        });
        
        console.log('[Reactivate] ✅ Successfully reactivated subscription in Stripe');
        
        // Update Supabase
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: false,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
        
        console.log('[Reactivate] ✅ Supabase synced');
        
        return NextResponse.json({ status: 'success', subscription });
      } catch (stripeError) {
        console.error('[Reactivate] ❌ Failed to update subscription in Stripe:', stripeError);
        return NextResponse.json(
          { error: 'Das Abonnement konnte nicht wiederhergestellt werden. Möglicherweise ist es bereits vollständig beendet.' },
          { status: 400 }
        );
      }
    }

    // If subscription is active/past_due but marked for cancellation, remove the cancellation
    if (currentSubscription.cancel_at_period_end) {
      console.log('[Reactivate] ✅ Removing cancellation flag...');
      
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      console.log('[Reactivate] ✅ Subscription reactivated in Stripe');

      // Update Supabase to match Stripe
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: subscription.status,
          cancel_at_period_end: false,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      console.log('[Reactivate] ✅ Supabase synced with Stripe');
      
      // Check if this user has a referral that was reverted due to cancellation
      console.log('[Reactivate] 🎁 Checking for reverted referral rewards...');
      
      // First, get the user_id from the subscription
      const { data: userSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();
      
      if (!userSubscription?.user_id) {
        console.log('[Reactivate] ⚠️ No user_id found for subscription');
        return NextResponse.json({ status: 'success', subscription });
      }
      
      const { data: referrals } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('referred_user_id', userSubscription.user_id)
        .eq('status', 'completed'); // Status was reverted to 'completed' when subscription was canceled
      
      if (referrals && referrals.length > 0) {
        for (const referral of referrals) {
          console.log('[Reactivate] 🎁 Found reverted referral:', referral.id);
          
          // Get referrer's subscription to apply credit
          const { data: referrerSub } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id, user_id')
            .eq('user_id', referral.referrer_user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (referrerSub?.stripe_customer_id) {
            try {
              // Re-apply the 250€ credit to referrer
              await stripe.customers.createBalanceTransaction(
                referrerSub.stripe_customer_id,
                {
                  amount: -25000, // Negative = credit
                  currency: 'eur',
                  description: `Empfehlungsbonus wiederhergestellt - Abo wurde reaktiviert`,
                  metadata: {
                    referral_id: referral.id,
                    referral_code: referral.referral_code,
                    referred_user_id: referral.referred_user_id,
                    reason: 'subscription_reactivated',
                  },
                }
              );
              
              // Update referral status back to 'rewarded'
              await supabaseAdmin
                .from('referrals')
                .update({
                  status: 'rewarded',
                  rewarded_at: new Date().toISOString()
                })
                .eq('id', referral.id);
              
              console.log('[Reactivate] ✅ Referral reward restored:', referral.id);
            } catch (error) {
              console.error('[Reactivate] ❌ Error restoring referral reward:', error);
            }
          }
        }
      }
      
      return NextResponse.json({ status: 'success', subscription });
    }

    // If we get here, the subscription is active and not marked for cancellation
    // This shouldn't happen, but let's sync Supabase anyway
    console.log('[Reactivate] ⚠️ Subscription is already active and not marked for cancellation');
    
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: currentSubscription.status,
        cancel_at_period_end: false,
        current_period_end: new Date(currentSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    console.log('[Reactivate] ✅ Supabase synced');

    return NextResponse.json({ status: 'success', subscription: currentSubscription });
  } catch (error) {
    console.error('[Reactivate] ❌ Subscription reactivation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to reactivate subscription',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}); 