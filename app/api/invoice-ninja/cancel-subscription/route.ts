import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/cancel-subscription
 * 
 * Kündigt ein Abo (stoppt Recurring Invoice)
 * User behält Zugriff bis Ende des aktuellen Abrechnungszeitraums
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

    console.log('[Cancel Subscription] Start für User:', userId);

    // 1. Lade Subscription aus Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      console.error('[Cancel Subscription] Subscription nicht gefunden');
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

    // 2. Stoppe Recurring Invoice in Invoice Ninja
    await InvoiceNinja.stopRecurringInvoice(subscription.invoice_ninja_subscription_id);

    console.log('[Cancel Subscription] Recurring Invoice gestoppt');

    // 3. Update Supabase Status
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
        last_api_sync: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Cancel Subscription] Supabase Update Error:', updateError);
      throw updateError;
    }

    console.log('[Cancel Subscription] Erfolgreich gekündigt');

    return NextResponse.json({
      success: true,
      message: 'Subscription erfolgreich gekündigt. Zugriff bleibt bis Ende des Abrechnungszeitraums bestehen.',
    });
  } catch (error) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

