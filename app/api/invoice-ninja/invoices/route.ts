import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * GET /api/invoice-ninja/invoices?userId=xxx
 * 
 * Lädt alle Rechnungen für einen User aus Invoice Ninja
 * Für die Rechnungsübersicht im Profil
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    console.log('[Get Invoices] Start für User:', userId);

    // 1. Lade Subscription aus Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Get Invoices] Supabase Fetch Error:', fetchError);
      throw fetchError;
    }

    if (!subscription?.invoice_ninja_client_id) {
      console.log('[Get Invoices] Keine Invoice Ninja Client ID');
      return NextResponse.json({
        success: true,
        invoices: [],
        message: 'No client found',
      });
    }

    // 2. Lade alle Invoices von Invoice Ninja
    const result = await InvoiceNinja.getClientInvoices(
      subscription.invoice_ninja_client_id
    );

    console.log('[Get Invoices] Invoices geladen:', result.data.length);

    // 3. Formatiere Invoices für Frontend
    const invoices = result.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      due_date: invoice.due_date,
      amount: invoice.amount,
      balance: invoice.balance,
      paid_to_date: invoice.paid_to_date,
      status: getInvoiceStatusLabel(invoice.status_id),
      status_id: invoice.status_id,
    }));

    return NextResponse.json({
      success: true,
      invoices,
      total: invoices.length,
    });
  } catch (error) {
    console.error('[Get Invoices] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Invoice Status Label
 */
function getInvoiceStatusLabel(statusId: string): string {
  const statusMap: Record<string, string> = {
    '1': 'Entwurf',
    '2': 'Gesendet',
    '3': 'Angesehen',
    '4': 'Bezahlt',
    '5': 'Teilweise bezahlt',
    '6': 'Überfällig',
    '-1': 'Storniert',
  };
  return statusMap[statusId] || 'Unbekannt';
}

