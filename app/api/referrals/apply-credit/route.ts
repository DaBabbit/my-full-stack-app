import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import InvoiceNinja from '@/utils/invoice-ninja';

/**
 * POST /api/referrals/apply-credit
 * 
 * Wendet Referral-Rabatt auf eine Invoice an
 * Wird automatisch aufgerufen, wenn eine neue Rechnung erstellt wird
 * 
 * Workflow:
 * 1. Prüfe ob User Referral-Guthaben hat
 * 2. Hole die nächste unbezahlte Rechnung
 * 3. Wende Rabatt über Invoice Ninja API an
 * 4. Markiere Referral als discount_applied
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, invoiceId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log('[Apply Referral Credit] Start für User:', userId);

    // 1. Prüfe ob User durch Referral geworben wurde
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referred_user_id', userId)
      .eq('status', 'completed') // Referrer's erste Zahlung ist erfolgt
      .eq('discount_applied', false) // Rabatt noch nicht angewendet
      .maybeSingle();

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('[Apply Referral Credit] Referral Fetch Error:', referralError);
      throw referralError;
    }

    if (!referral) {
      console.log('[Apply Referral Credit] Kein aktives Referral-Guthaben gefunden');
      return NextResponse.json({
        success: true,
        message: 'No referral credit available',
        creditApplied: false,
      });
    }

    // 2. Hole User's Subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription?.invoice_ninja_client_id) {
      console.log('[Apply Referral Credit] Keine Invoice Ninja Subscription');
      return NextResponse.json({
        success: true,
        message: 'No subscription found',
        creditApplied: false,
      });
    }

    // 3. Wenn keine InvoiceId übergeben: Hole die nächste unbezahlte Rechnung
    let targetInvoiceId = invoiceId;
    
    if (!targetInvoiceId) {
      const invoices = await InvoiceNinja.getClientInvoices(
        subscription.invoice_ninja_client_id,
        { status: 'unpaid' }
      );

      if (!invoices.data || invoices.data.length === 0) {
        console.log('[Apply Referral Credit] Keine unbezahlte Rechnung gefunden');
        return NextResponse.json({
          success: true,
          message: 'No unpaid invoice found',
          creditApplied: false,
        });
      }

      // Nimm die neueste unbezahlte Rechnung
      targetInvoiceId = invoices.data[0].id;
    }

    // 4. Wende Rabatt auf Rechnung an (250€)
    const discountAmount = referral.discount_amount / 100; // Von Cent zu Euro
    await InvoiceNinja.applyDiscountToInvoice(targetInvoiceId, discountAmount);

    console.log('[Apply Referral Credit] Rabatt angewendet:', discountAmount, '€');

    // 5. Update Referral in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        discount_applied: true,
        applied_to_invoice_id: targetInvoiceId,
        rewarded_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('[Apply Referral Credit] Referral Update Error:', updateError);
      throw updateError;
    }

    console.log('[Apply Referral Credit] Erfolgreich abgeschlossen');

    return NextResponse.json({
      success: true,
      creditApplied: true,
      discountAmount: discountAmount,
      invoiceId: targetInvoiceId,
      message: `Referral-Rabatt von ${discountAmount}€ erfolgreich angewendet`,
    });
  } catch (error) {
    console.error('[Apply Referral Credit] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply referral credit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

