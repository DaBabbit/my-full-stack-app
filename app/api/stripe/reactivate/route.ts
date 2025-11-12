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
    
    // Check if subscription is truly canceled in Stripe
    if (currentSubscription.status === 'canceled') {
      console.log('[Reactivate] ❌ Subscription is truly canceled in Stripe');
      
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
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}); 