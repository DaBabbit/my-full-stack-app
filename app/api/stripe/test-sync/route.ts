import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Testing sync for user:', userId);

    // Get all subscriptions for this user from Supabase
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error', details: dbError }, { status: 500 });
    }

    console.log('Found subscriptions in DB:', subscriptions);

    const results = [];

    // Sync each subscription with Stripe
    for (const sub of subscriptions || []) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        
        console.log('Stripe subscription:', {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          current_period_end: stripeSubscription.current_period_end
        });

        // Update the subscription in Supabase
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: stripeSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error('Update error:', updateError);
          results.push({
            subscription_id: sub.id,
            stripe_id: sub.stripe_subscription_id,
            status: 'error',
            error: updateError
          });
        } else {
          results.push({
            subscription_id: sub.id,
            stripe_id: sub.stripe_subscription_id,
            status: 'updated',
            new_status: stripeSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end
          });
        }
      } catch (stripeError) {
        console.error('Stripe error for subscription', sub.stripe_subscription_id, stripeError);
        results.push({
          subscription_id: sub.id,
          stripe_id: sub.stripe_subscription_id,
          status: 'stripe_error',
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      user_id: userId,
      results
    });

  } catch (error) {
    console.error('Test sync failed:', error);
    return NextResponse.json({ 
      error: 'Failed to test sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
