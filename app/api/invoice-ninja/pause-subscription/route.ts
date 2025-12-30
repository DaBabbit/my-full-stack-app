import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/pause-subscription
 * 
 * Pausiert ein Abo (Recurring Invoice wird pausiert)
 * Kann später mit reactivate wieder aktiviert werden
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

    console.log('[Pause Subscription] Start für User:', userId);

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

    // 2. Pausiere Recurring Invoice in Invoice Ninja
    await InvoiceNinja.pauseRecurringInvoice(subscription.invoice_ninja_subscription_id);

    console.log('[Pause Subscription] Recurring Invoice pausiert');

    // 3. Update Supabase Status
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
        last_api_sync: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Pause Subscription] Supabase Update Error:', updateError);
      throw updateError;
    }

    console.log('[Pause Subscription] Erfolgreich pausiert');

    return NextResponse.json({
      success: true,
      message: 'Subscription erfolgreich pausiert',
    });
  } catch (error) {
    console.error('[Pause Subscription] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to pause subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

