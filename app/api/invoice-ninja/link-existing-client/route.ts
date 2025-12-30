import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/link-existing-client
 * 
 * Automatisches Linking von existierenden Invoice Ninja Clients zu WebApp-Accounts
 * 
 * Workflow:
 * 1. Suche Invoice Ninja Client by Email
 * 2. Wenn gefunden: Hole Recurring Invoices
 * 3. Erstelle/Update Subscription in Supabase
 * 4. Synchronisiere Status
 * 
 * Use Case: Migration existierender Kunden (z.B. Kunde #27)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userEmail' },
        { status: 400 }
      );
    }

    console.log('[Link Existing Client] Start für User:', userId, userEmail);

    // 1. Suche Invoice Ninja Client by Email
    const clients = await InvoiceNinja.searchClientsByEmail(userEmail);

    if (clients.length === 0) {
      console.log('[Link Existing Client] Kein Client gefunden für:', userEmail);
      return NextResponse.json({
        found: false,
        message: 'No existing Invoice Ninja client found for this email',
      });
    }

    // Bei mehreren Matches: Nehme den ersten (sollte nicht vorkommen bei exakter Email)
    const client = clients[0];
    console.log('[Link Existing Client] Client gefunden:', client.id, client.name);

    // 2. Hole Recurring Invoices für diesen Client
    const recurringInvoices = await InvoiceNinja.getClientRecurringInvoices(client.id);
    
    // Finde aktive Subscription (status_id = 2 = Active)
    const activeSubscription = recurringInvoices.find(
      (inv) => inv.status_id === '2' || inv.status_id === 2
    );

    console.log('[Link Existing Client] Recurring Invoices:', recurringInvoices.length);
    console.log('[Link Existing Client] Aktive Subscription:', activeSubscription?.id || 'keine');

    // 3. Prüfe Status via Invoice Ninja API
    const statusResult = await InvoiceNinja.checkSubscriptionStatus(client.id);
    console.log('[Link Existing Client] Status:', statusResult.status);

    // 4. Erstelle/Update Subscription in Supabase
    const subscriptionData = {
      user_id: userId,
      invoice_ninja_client_id: client.id,
      invoice_ninja_subscription_id: activeSubscription?.id || null,
      payment_method: 'gocardless_sepa',
      status: statusResult.status,
      current_period_end: statusResult.currentPeriodEnd?.toISOString() || null,
      invoice_ninja_invoice_id: statusResult.lastInvoice?.id || null,
      last_api_sync: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cancel_at_period_end: false,
    };

    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[Link Existing Client] Supabase Upsert Error:', upsertError);
      throw upsertError;
    }

    console.log('[Link Existing Client] ✅ Erfolgreich verknüpft!');

    return NextResponse.json({
      success: true,
      found: true,
      linked: true,
      clientId: client.id,
      subscriptionId: activeSubscription?.id,
      status: statusResult.status,
      message: 'Existing Invoice Ninja client successfully linked to your account',
    });
  } catch (error) {
    console.error('[Link Existing Client] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to link existing client',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

