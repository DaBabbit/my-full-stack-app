import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/create-subscription
 * 
 * Erstellt ein neues Abo für einen User:
 * 1. Erstellt Client in Invoice Ninja
 * 2. Erstellt Recurring Invoice (monatliches Abo)
 * 3. Speichert IDs in Supabase subscriptions Tabelle
 * 4. Gibt Client Portal URL zurück
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userEmail' },
        { status: 400 }
      );
    }

    console.log('[Create Subscription] Start für User:', userId);

    // 1. Prüfe ob User bereits eine Subscription hat
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub?.invoice_ninja_client_id) {
      console.log('[Create Subscription] User hat bereits Subscription');
      
      // Gebe existierenden Client Portal URL zurück
      const client = await InvoiceNinja.getClient(existingSub.invoice_ninja_client_id);
      const contactKey = client.contacts[0]?.contact_key;
      
      return NextResponse.json({
        success: true,
        existing: true,
        clientId: existingSub.invoice_ninja_client_id,
        clientPortalUrl: InvoiceNinja.getClientPortalUrl(contactKey),
      });
    }

    // 2. Erstelle Client in Invoice Ninja
    const invoiceNinjaClient = await InvoiceNinja.createClient({
      name: userName || userEmail.split('@')[0],
      email: userEmail,
      user_id: userId,
    });

    console.log('[Create Subscription] Client erstellt:', invoiceNinjaClient.id);

    // 3. Erstelle Recurring Invoice (= Abo)
    const product = InvoiceNinja.getMonthlySubscriptionProduct();
    const recurringInvoice = await InvoiceNinja.createRecurringInvoice({
      client_id: invoiceNinjaClient.id,
      line_items: [product],
      frequency_id: '5', // Monthly
      auto_bill: 'always', // GoCardless auto-bill
    });

    console.log('[Create Subscription] Recurring Invoice erstellt:', recurringInvoice.id);

    // 4. Speichere in Supabase subscriptions Tabelle
    if (existingSub) {
      // Update existing row
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          invoice_ninja_client_id: invoiceNinjaClient.id,
          invoice_ninja_subscription_id: recurringInvoice.id,
          payment_method: 'gocardless_sepa',
          status: 'pending', // Wird auf 'active' gesetzt nach erster Zahlung
          updated_at: new Date().toISOString(),
          last_api_sync: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Create Subscription] Supabase Update Error:', updateError);
        throw updateError;
      }
    } else {
      // Create new row
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          invoice_ninja_client_id: invoiceNinjaClient.id,
          invoice_ninja_subscription_id: recurringInvoice.id,
          payment_method: 'gocardless_sepa',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_api_sync: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Create Subscription] Supabase Insert Error:', insertError);
        throw insertError;
      }
    }

    console.log('[Create Subscription] Subscription in Supabase gespeichert');

    // 5. Generiere Client Portal URL
    const contactKey = invoiceNinjaClient.contacts[0]?.contact_key;
    const clientPortalUrl = InvoiceNinja.getClientPortalUrl(contactKey);

    console.log('[Create Subscription] Erfolgreich abgeschlossen');

    return NextResponse.json({
      success: true,
      clientId: invoiceNinjaClient.id,
      subscriptionId: recurringInvoice.id,
      clientPortalUrl,
      message: 'Subscription erfolgreich erstellt. Bitte richten Sie Ihr SEPA-Lastschriftmandat im Client Portal ein.',
    });
  } catch (error) {
    console.error('[Create Subscription] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create subscription', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

