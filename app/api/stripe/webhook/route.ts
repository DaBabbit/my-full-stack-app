import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { withCors } from '@/utils/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function for consistent logging
function logWebhookEvent(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] WEBHOOK: ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Define interfaces for stored data
interface StoredSessionData {
  userId: string;
  customerId: string;
}

interface StoredSubscriptionData {
  id: string;
  customer: string;
}

// Store both checkout sessions and subscriptions temporarily
const checkoutSessionMap = new Map<string, StoredSessionData>();
const pendingSubscriptions = new Map<string, StoredSubscriptionData>();

// Need to disable body parsing for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

async function checkExistingSubscription(customerId: string): Promise<boolean> {
  const { data: existingSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .in('status', ['active', 'trialing'])
    .single();

  return !!existingSubs;
}

// Currently Handled Events:
// 1. checkout.session.completed - When a customer completes checkout
// 2. customer.subscription.created - When a new subscription is created
// 3. customer.subscription.updated - When a subscription is updated
// 4. customer.subscription.deleted - When a subscription is cancelled/deleted
// 5. customer.subscription.pending_update_applied - When a pending update is applied
// 6. customer.subscription.pending_update_expired - When a pending update expires
// 7. customer.subscription.trial_will_end - When a trial is about to end

// Other Important Events You Might Want to Handle:
// Payment Related:
// - invoice.paid - When an invoice is paid successfully
// - invoice.payment_failed - When a payment fails
// - invoice.upcoming - When an invoice is going to be created
// - payment_intent.succeeded - When a payment is successful
// - payment_intent.payment_failed - When a payment fails

// Customer Related:
// - customer.created - When a new customer is created
// - customer.updated - When customer details are updated
// - customer.deleted - When a customer is deleted

// Subscription Related:
// - customer.subscription.paused - When a subscription is paused
// - customer.subscription.resumed - When a subscription is resumed
// - customer.subscription.trial_will_end - 3 days before trial ends

// Checkout Related:
// - checkout.session.async_payment_succeeded - Async payment success
// - checkout.session.async_payment_failed - Async payment failure
// - checkout.session.expired - When checkout session expires

export const POST = withCors(async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  try {
    logWebhookEvent('Received webhook request');
    logWebhookEvent('Stripe signature', sig);

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    logWebhookEvent(`Event received: ${event.type}`, event.data.object);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Check for existing active subscription
        const hasActiveSubscription = await checkExistingSubscription(session.customer as string);
        
        if (hasActiveSubscription) {
          logWebhookEvent('Duplicate subscription attempt blocked', {
            customerId: session.customer,
            sessionId: session.id
          });
          
          // Cancel the new subscription immediately
          if (session.subscription) {
            await stripe.subscriptions.cancel(session.subscription as string);
          }
          
          return NextResponse.json({ 
            status: 'blocked',
            message: 'Customer already has an active subscription'
          });
        }

        logWebhookEvent('Processing checkout.session.completed', {
          sessionId: session.id,
          clientReferenceId: session.client_reference_id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (!session.client_reference_id || !session.customer || !session.subscription) {
          logWebhookEvent('Missing required session data', {
            clientReferenceId: session.client_reference_id,
            customerId: session.customer,
            subscriptionId: session.subscription
          });
          return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
        }

        try {
          const subscription = await createSubscription(
            session.subscription as string,
            session.client_reference_id!,
            session.customer as string
          );
          logWebhookEvent('Successfully created subscription', subscription);
        } catch (error) {
          logWebhookEvent('Failed to create subscription', error);
          throw error;
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Check if we have the session data already
        const sessionData = checkoutSessionMap.get(subscription.id);
        if (sessionData) {
          // We can create the subscription now
          await createSubscription(
            subscription.id,
            sessionData.userId,
            sessionData.customerId
          );
          checkoutSessionMap.delete(subscription.id);
        } else {
          // Store the subscription data until we get the session
          pendingSubscriptions.set(subscription.id, {
            id: subscription.id,
            customer: subscription.customer as string
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.pending_update_applied':
      case 'customer.subscription.pending_update_expired':
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription in database
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          .select('user_id')
          .single();
        
        // If subscription was just canceled (cancel_at_period_end set to true), revert referral reward
        if (subscription.cancel_at_period_end && subData?.user_id) {
          logWebhookEvent('⚠️ Subscription canceled - reverting referral reward', { 
            userId: subData.user_id,
            subscriptionId: subscription.id 
          });
          
          // Find any rewarded referrals for this user
          const { data: referral, error: referralError } = await supabaseAdmin
            .from('referrals')
            .select('*')
            .eq('referred_user_id', subData.user_id)
            .eq('status', 'rewarded')
            .single();
          
          if (!referralError && referral) {
            logWebhookEvent('🔄 Found rewarded referral to revert', { referralId: referral.id });
            
            // Revert referral status back to completed
            await supabaseAdmin
              .from('referrals')
              .update({
                status: 'completed',
                rewarded_at: null
              })
              .eq('id', referral.id);
            
            // Get referrer's Stripe customer ID to remove credit
            const { data: referrerSub } = await supabaseAdmin
              .from('subscriptions')
              .select('stripe_customer_id')
              .eq('user_id', referral.referrer_user_id)
              .single();
            
            if (referrerSub?.stripe_customer_id) {
              try {
                // Add positive balance transaction to offset the negative credit
                await stripe.customers.createBalanceTransaction(
                  referrerSub.stripe_customer_id,
                  {
                    amount: 25000, // Positive to remove credit
                    currency: 'eur',
                    description: `Empfehlungsbonus zurückgenommen - Abo wurde gekündigt`,
                    metadata: {
                      referral_id: referral.id,
                      referral_code: referral.referral_code,
                      reason: 'subscription_canceled',
                    },
                  }
                );
                
                logWebhookEvent('✅ Referral credit reverted', { 
                  referralId: referral.id,
                  customerId: referrerSub.stripe_customer_id 
                });
              } catch (stripeError) {
                logWebhookEvent('❌ Error reverting credit', stripeError);
              }
            }
          }
        }
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            current_period_end: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        logWebhookEvent('👤 Customer updated', { customerId: customer.id });
        // Sync customer metadata if needed
        break;
      }

      case 'invoice.created': {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent('📄 Invoice created', { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription 
        });
        
        if (invoice.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: stripeSubscription.status,
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent('✅ Invoice finalized', { 
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          subscriptionId: invoice.subscription 
        });
        
        // Check if first payment for referral system
        if (invoice.subscription && invoice.amount_paid > 0) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, created_at')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single();
          
          if (subscription) {
            const createdAt = new Date(subscription.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;
            
            // If subscription created within last 5 minutes, treat as first payment
            if (diffMinutes < 5) {
              logWebhookEvent('🎉 First payment detected via invoice.finalized');
              // Process referral (same logic as invoice.paid)
              // Check if this user was referred
              const { data: referral, error: referralError } = await supabaseAdmin
                .from('referrals')
                .select('*')
                .eq('referred_user_id', subscription.user_id)
                .in('status', ['pending', 'completed'])
                .single();
              
              if (!referralError && referral) {
                logWebhookEvent('🎯 Referral found via finalized! Processing reward...', {
                  referralId: referral.id,
                  referralCode: referral.referral_code
                });
                
                // Update referral status
                await supabaseAdmin
                  .from('referrals')
                  .update({
                    first_payment_received: true,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', referral.id);
                
                // Get referrer's Stripe customer ID and apply credit
                const { data: referrerSub } = await supabaseAdmin
                  .from('subscriptions')
                  .select('stripe_customer_id')
                  .eq('user_id', referral.referrer_user_id)
                  .single();
                
                if (referrerSub?.stripe_customer_id) {
                  try {
                    const balanceTransaction = await stripe.customers.createBalanceTransaction(
                      referrerSub.stripe_customer_id,
                      {
                        amount: -25000,
                        currency: 'eur',
                        description: `Empfehlungsbonus für ${referral.referral_code}`,
                        metadata: {
                          referral_id: referral.id,
                          referral_code: referral.referral_code,
                          referred_user_id: subscription.user_id,
                        },
                      }
                    );
                    
                    await supabaseAdmin
                      .from('referrals')
                      .update({
                        status: 'rewarded',
                        rewarded_at: new Date().toISOString(),
                      })
                      .eq('id', referral.id);
                    
                    logWebhookEvent('🎊 Referral reward applied via finalized!', {
                      balanceTransactionId: balanceTransaction.id
                    });
                  } catch (stripeError) {
                    logWebhookEvent('❌ Stripe error in finalized:', stripeError);
                  }
                }
              }
            }
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent('✅ Invoice paid received', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          billingReason: invoice.billing_reason,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency
        });
        
        // Check if this is the first payment for a subscription
        if (invoice.subscription && invoice.billing_reason === 'subscription_create') {
          logWebhookEvent('🎉 First subscription payment detected - checking for referral');
          
          // Get user_id from subscription via our database
          const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, stripe_customer_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single();
          
          if (subError || !subscription) {
            logWebhookEvent('❌ Subscription not found in database', { 
              error: subError,
              subscriptionId: invoice.subscription 
            });
            break;
          }

          logWebhookEvent('✅ Subscription found in DB', {
            userId: subscription.user_id,
            customerId: subscription.stripe_customer_id
          });

          // Check if this user was referred
          const { data: referral, error: referralError } = await supabaseAdmin
            .from('referrals')
            .select('*')
            .eq('referred_user_id', subscription.user_id)
            .in('status', ['pending', 'completed'])
            .single();
          
          if (referralError || !referral) {
            logWebhookEvent('ℹ️ No referral found for this user', {
              userId: subscription.user_id,
              error: referralError
            });
            break;
          }

          logWebhookEvent('🎯 Referral found! Processing reward...', {
            referralId: referral.id,
            referralCode: referral.referral_code,
            referrerId: referral.referrer_user_id,
            referredUserId: subscription.user_id,
            currentStatus: referral.status
          });
          
          // Update referral - mark first payment as received
          const { error: updateError1 } = await supabaseAdmin
            .from('referrals')
            .update({
              first_payment_received: true,
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', referral.id);

          if (updateError1) {
            logWebhookEvent('❌ Failed to update referral to completed', updateError1);
          } else {
            logWebhookEvent('✅ Referral updated to completed');
          }
          
          // Get referrer's Stripe customer ID
          const { data: referrerSub, error: refSubError } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', referral.referrer_user_id)
            .single();
          
          if (refSubError || !referrerSub?.stripe_customer_id) {
            logWebhookEvent('⚠️ Referrer has no Stripe customer ID yet', {
              referrerId: referral.referrer_user_id,
              error: refSubError
            });
            break;
          }

          logWebhookEvent('💰 Creating balance credit for referrer...', {
            customerId: referrerSub.stripe_customer_id,
            amount: -25000,
            currency: 'eur'
          });

          try {
            // Create Customer Balance Transaction (Credit)
            // Negative amount = Credit that will be applied to next invoice
            const balanceTransaction = await stripe.customers.createBalanceTransaction(
              referrerSub.stripe_customer_id,
              {
                amount: -25000, // -250€ = Credit
                currency: 'eur',
                description: `Empfehlungsbonus für ${referral.referral_code}`,
                metadata: {
                  referral_id: referral.id,
                  referral_code: referral.referral_code,
                  referred_user_id: subscription.user_id,
                },
              }
            );
            
            logWebhookEvent('✅ Balance credit created successfully', {
              balanceTransactionId: balanceTransaction.id,
              amount: balanceTransaction.amount
            });

            // Update referral status to rewarded
            const { error: updateError2 } = await supabaseAdmin
              .from('referrals')
              .update({
                status: 'rewarded',
                rewarded_at: new Date().toISOString(),
              })
              .eq('id', referral.id);
            
            if (updateError2) {
              logWebhookEvent('❌ Failed to update referral to rewarded', updateError2);
            } else {
              logWebhookEvent('🎊 Referral reward applied successfully!', {
                referralCode: referral.referral_code,
                referrerId: referral.referrer_user_id,
                balanceTransactionId: balanceTransaction.id,
                creditAmount: '250€',
              });
            }
          } catch (stripeError) {
            logWebhookEvent('❌ Stripe error creating balance transaction', stripeError);
          }
        } else {
          logWebhookEvent('ℹ️ Invoice paid but not first payment (billing_reason: ' + invoice.billing_reason + ')');
        }
        break;
      }

      // case 'invoice.payment_failed': {
      //   const invoice = event.data.object as Stripe.Invoice;
      //   // Handle failed payment, notify user
      // }

      // case 'customer.subscription.trial_will_end': {
      //   const subscription = event.data.object as Stripe.Subscription;
      //   // Notify user about trial ending
      // }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logWebhookEvent('Webhook error', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
});

async function createSubscription(subscriptionId: string, userId: string, customerId: string) {
  logWebhookEvent('Starting createSubscription', { subscriptionId, userId, customerId });

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    logWebhookEvent('Retrieved Stripe subscription', stripeSubscription);

    const { data: existingData, error: checkError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (checkError) {
      logWebhookEvent('Error checking existing subscription', checkError);
    }

    if (existingData) {
      logWebhookEvent('Found existing subscription', existingData);
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: stripeSubscription.status,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        logWebhookEvent('Error updating existing subscription', updateError);
        throw updateError;
      }
      return existingData;
    }

    logWebhookEvent('Creating new subscription record');
    const { data, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: stripeSubscription.status,
        price_id: stripeSubscription.items.data[0]?.price.id,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      logWebhookEvent('Error inserting new subscription', insertError);
      throw insertError;
    }

    logWebhookEvent('Successfully created new subscription', data);
    return data;
  } catch (error) {
    logWebhookEvent('Error in createSubscription', error);
    throw error;
  }
} 