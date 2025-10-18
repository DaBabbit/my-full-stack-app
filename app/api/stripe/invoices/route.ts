import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer ID from subscriptions table
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 20, // Last 20 invoices
    });

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map(invoice => {
      // Get subscription line item for correct period dates
      const subscriptionLine = invoice.lines.data.find(line => line.type === 'subscription');
      
      return {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.total || invoice.amount_due, // Use total or amount_due instead of amount_paid
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        // Use line item period for accurate billing dates
        period_start: subscriptionLine?.period?.start || invoice.period_start,
        period_end: subscriptionLine?.period?.end || invoice.period_end,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        description: invoice.description || `Rechnung ${invoice.number}`,
      };
    });

    return NextResponse.json({ invoices: formattedInvoices });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
