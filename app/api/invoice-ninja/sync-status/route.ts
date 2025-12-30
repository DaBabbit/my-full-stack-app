import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/sync-status
 * 
 * Synchronisiert den Subscription-Status mit Invoice Ninja API
 * Wird beim Login/Seitenaufruf aufgerufen (alle 5 Minuten via Hook)
 * 
 * 1. Lädt Subscription aus Supabase
 * 2. Prüft Status via Invoice Ninja API
 * 3. Updated Supabase mit neuem Status
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

    console.log('[Sync Status] Start für User:', userId);

    // 1. Lade Subscription aus Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Sync Status] Supabase Fetch Error:', fetchError);
      throw fetchError;
    }

    if (!subscription) {
      console.log('[Sync Status] Keine Subscription gefunden');
      return NextResponse.json({
        success: true,
        status: 'no_subscription',
        message: 'User hat keine Subscription',
      });
    }

    if (!subscription.invoice_ninja_client_id) {
      console.log('[Sync Status] Keine Invoice Ninja Client ID');
      return NextResponse.json({
        success: true,
        status: 'no_invoice_ninja_client',
        message: 'Subscription hat keine Invoice Ninja Client ID',
      });
    }

    // 2. Prüfe Status via Invoice Ninja API
    const statusResult = await InvoiceNinja.checkSubscriptionStatus(
      subscription.invoice_ninja_client_id
    );

    console.log('[Sync Status] Invoice Ninja Status:', statusResult);

    // 3. Update Supabase
    const updateData: Record<string, unknown> = {
      status: statusResult.status,
      last_api_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (statusResult.currentPeriodEnd) {
      updateData.current_period_end = statusResult.currentPeriodEnd.toISOString();
    }

    if (statusResult.lastInvoice) {
      updateData.invoice_ninja_invoice_id = statusResult.lastInvoice.id;
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Sync Status] Supabase Update Error:', updateError);
      throw updateError;
    }

    console.log('[Sync Status] Erfolgreich synchronisiert');

    return NextResponse.json({
      success: true,
      status: statusResult.status,
      isActive: statusResult.isActive,
      currentPeriodEnd: statusResult.currentPeriodEnd,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

