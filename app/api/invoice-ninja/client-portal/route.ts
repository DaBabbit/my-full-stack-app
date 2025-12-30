import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/invoice-ninja/client-portal
 * 
 * Gibt die Client Portal URL für den eingeloggten User zurück
 * User kann dort Rechnungen sehen, SEPA-Mandat einrichten, Zahlungen vornehmen
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

    console.log('[Client Portal] Start für User:', userId);

    // 1. Lade Subscription aus Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Client Portal] Supabase Fetch Error:', fetchError);
      throw fetchError;
    }

    if (!subscription?.invoice_ninja_client_id) {
      return NextResponse.json(
        { error: 'No Invoice Ninja client found. Please create a subscription first.' },
        { status: 404 }
      );
    }

    // 2. Lade Client von Invoice Ninja
    const client = await InvoiceNinja.getClient(subscription.invoice_ninja_client_id);

    if (!client.contacts || client.contacts.length === 0) {
      return NextResponse.json(
        { error: 'No client contacts found' },
        { status: 404 }
      );
    }

    // 3. Generiere Portal URL
    const contactKey = client.contacts[0].contact_key;
    const portalUrl = InvoiceNinja.getClientPortalUrl(contactKey);

    console.log('[Client Portal] Portal URL generiert');

    return NextResponse.json({
      success: true,
      url: portalUrl,
      clientId: client.id,
    });
  } catch (error) {
    console.error('[Client Portal] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get client portal URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

