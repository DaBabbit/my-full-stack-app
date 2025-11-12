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

    // Get current subscription from Stripe
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('[Reactivate] Current status:', currentSubscription.status);

    let subscription;
    
    // If subscription is already canceled, we need to resume it
    if (currentSubscription.status === 'canceled') {
      console.log('[Reactivate] ⚠️ Subscription is canceled, attempting to resume...');
      
      // We cannot resume a canceled subscription via API
      // We need to create a new subscription or inform user to contact support
      return NextResponse.json(
        { error: 'Subscription is bereits vollständig gekündigt. Bitte kontaktiere den Support oder erstelle ein neues Abo.' },
        { status: 400 }
      );
    }

    // If subscription is active but marked for cancellation, remove the cancellation
    subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    console.log('[Reactivate] ✅ Subscription reactivated in Stripe');

    // Update Supabase
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: subscription.status,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    console.log('[Reactivate] ✅ Subscription updated in Supabase');

    return NextResponse.json({ status: 'success', subscription });
  } catch (error) {
    console.error('[Reactivate] ❌ Subscription reactivation failed:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}); 