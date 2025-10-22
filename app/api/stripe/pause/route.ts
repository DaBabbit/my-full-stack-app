import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      );
    }

    // Pause the subscription in Stripe
    // The subscription will remain active until the end of the current period
    // and then pause collection
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void', // Don't charge customer during pause
      },
    });

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update subscription in database:', updateError);
    }

    return NextResponse.json({ 
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        pause_collection: subscription.pause_collection,
      },
    });

  } catch (error: any) {
    console.error('Pause subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}

