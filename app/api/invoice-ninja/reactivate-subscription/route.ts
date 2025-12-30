import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/reactivate-subscription
 * 
 * Reaktiviert ein pausiertes/gekündigtes Abo
 * Setzt Recurring Invoice wieder auf "active"
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log('[Reactivate Subscription] Start für User:', userId);

    // 1. Lade Subscription aus Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!subscription.invoice_ninja_subscription_id) {
      return NextResponse.json(
        { error: 'No Invoice Ninja subscription ID' },
        { status: 400 }
      );
    }

    // 2. Reaktiviere Recurring Invoice in Invoice Ninja
    await InvoiceNinja.resumeRecurringInvoice(subscription.invoice_ninja_subscription_id);

    console.log('[Reactivate Subscription] Recurring Invoice reaktiviert');

    // 3. Update Supabase Status
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
        last_api_sync: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Reactivate Subscription] Supabase Update Error:', updateError);
      throw updateError;
    }

    console.log('[Reactivate Subscription] Erfolgreich reaktiviert');

    return NextResponse.json({
      success: true,
      message: 'Subscription erfolgreich reaktiviert',
    });
  } catch (error) {
    console.error('[Reactivate Subscription] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reactivate subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

