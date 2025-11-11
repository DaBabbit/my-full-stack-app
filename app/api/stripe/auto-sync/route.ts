import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Auto-Sync] Syncing for user:', user.id);

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();
    
    if (!sub?.stripe_subscription_id) {
      console.log('[Auto-Sync] No subscription found');
      return NextResponse.json({ error: 'No subscription' }, { status: 404 });
    }

    // Fetch from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    
    console.log('[Auto-Sync] Stripe status:', stripeSubscription.status);
    console.log('[Auto-Sync] Period end:', new Date(stripeSubscription.current_period_end * 1000));

    // Update Supabase
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: stripeSubscription.status,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', sub.stripe_subscription_id);

    if (updateError) {
      console.error('[Auto-Sync] Update error:', updateError);
      throw updateError;
    }

    console.log('[Auto-Sync] ✅ Sync successful');

    return NextResponse.json({ 
      status: 'success',
      subscription: {
        status: stripeSubscription.status,
        current_period_end: stripeSubscription.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('[Auto-Sync] Error:', error);
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

