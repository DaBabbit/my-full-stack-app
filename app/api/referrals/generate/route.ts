import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('[Referrals Generate] No authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Referrals Generate] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the correct base URL from request or env
    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Check if user already has an active referral code
    const { data: existingReferral } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingReferral) {
      // Return existing referral link
      const referralLink = `${baseUrl}/login?ref=${existingReferral.referral_code}`;
      console.log('[Referrals Generate] Returning existing referral:', existingReferral.referral_code);
      console.log('[Referrals Generate] Referral link:', referralLink);
      return NextResponse.json({ 
        referralLink,
        referralCode: existingReferral.referral_code 
      });
    }

    // Generate unique referral code
    const referralCode = `REF-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    console.log('[Referrals Generate] Generating new referral code:', referralCode);

    // Create Stripe Coupon (250€ off)
    const coupon = await stripe.coupons.create({
      amount_off: 25000, // 250€ in cents
      currency: 'eur',
      duration: 'once',
      name: `Referral Bonus - ${referralCode}`,
      metadata: {
        referrer_user_id: user.id,
        referral_code: referralCode,
      },
    });

    console.log('[Referrals Generate] Stripe coupon created:', coupon.id);

    // Create Promotion Code in Stripe
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: referralCode,
      max_redemptions: 1,
      metadata: {
        referrer_user_id: user.id,
      },
    });

    console.log('[Referrals Generate] Stripe promotion code created:', promotionCode.id);

    // Store referral in database
    const { error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_user_id: user.id,
        referral_code: referralCode,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code: promotionCode.id,
        status: 'pending',
      });

    if (insertError) {
      console.error('[Referrals Generate] Failed to store referral:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    const referralLink = `${baseUrl}/login?ref=${referralCode}`;

    console.log('[Referrals Generate] Referral created successfully:', referralCode);
    console.log('[Referrals Generate] Referral link:', referralLink);

    return NextResponse.json({ 
      referralLink,
      referralCode,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Generate referral error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

