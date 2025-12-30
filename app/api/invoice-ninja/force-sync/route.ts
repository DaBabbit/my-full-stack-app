import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as InvoiceNinja from '@/utils/invoice-ninja';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('[Force Sync] Starting for user:', userId);

    // 1. Get subscription from Supabase
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    console.log('[Force Sync] Current status:', subscription.status);

    if (!subscription.invoice_ninja_client_id) {
      return NextResponse.json({ 
        error: 'No Invoice Ninja client linked',
        hint: 'User needs to be linked to Invoice Ninja first'
      }, { status: 400 });
    }

    // 2. Check status in Invoice Ninja
    const status = await InvoiceNinja.checkSubscriptionStatus(
      subscription.invoice_ninja_client_id
    );

    console.log('[Force Sync] Invoice Ninja status:', status);

    // 3. Update Supabase with fresh data
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: status.status,
        current_period_end: status.currentPeriodEnd?.toISOString(),
        last_api_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Force Sync] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    console.log('[Force Sync] ✅ Success! New status:', status.status);

    return NextResponse.json({
      success: true,
      previousStatus: subscription.status,
      newStatus: status.status,
      nextPaymentDate: status.currentPeriodEnd?.toISOString(),
    });

  } catch (error) {
    console.error('[Force Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}

