import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { withCors } from '@/utils/cors';
import InvoiceNinja from '@/utils/invoice-ninja';

export const DELETE = withCors(async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Starting account soft-deletion for user:', userId);

    // 1. Cancel Invoice Ninja subscriptions if they exist
    const { data: subscriptionsData, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('invoice_ninja_subscription_id, stripe_subscription_id, status')
      .eq('user_id', userId);

    if (subError) {
      console.error('Subscription fetch error:', subError);
    } else if (subscriptionsData) {
      for (const sub of subscriptionsData) {
        // Cancel Invoice Ninja recurring invoice
        if (sub.invoice_ninja_subscription_id && (sub.status === 'active' || sub.status === 'trialing')) {
          try {
            await InvoiceNinja.updateRecurringInvoice(sub.invoice_ninja_subscription_id, {
              is_deleted: true,
            });
            console.log('Invoice Ninja subscription cancelled:', sub.invoice_ninja_subscription_id);
          } catch (invoiceNinjaError) {
            console.error('Invoice Ninja cancellation error:', invoiceNinjaError);
          }
        }
        // Legacy: Cancel old Stripe subscriptions if they still exist
        else if (sub.stripe_subscription_id && (sub.status === 'active' || sub.status === 'trialing')) {
          console.log('Legacy Stripe subscription found, marking as canceled:', sub.stripe_subscription_id);
          // Don't call Stripe API (not installed anymore), just mark as canceled in DB
        }
      }
    }

    // 2. Soft delete the profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ 
        deleted_at: new Date().toISOString(),
        is_deleted: true
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError },
        { status: 500 }
      );
    }

    // 3. Mark subscriptions as canceled
    const { error: subscriptionUpdateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'canceled'
      })
      .eq('user_id', userId);

    if (subscriptionUpdateError) {
      console.error('Subscription update error:', subscriptionUpdateError);
    }

    console.log('Account soft-deletion completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in account soft-deletion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process account deletion', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}); 