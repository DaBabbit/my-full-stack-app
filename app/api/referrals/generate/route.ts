import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST() {
  try {
    const supabase = supabaseAdmin;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has an active referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingReferral) {
      // Return existing referral link
      const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${existingReferral.referral_code}`;
      return NextResponse.json({ 
        referralLink,
        referralCode: existingReferral.referral_code 
      });
    }

    // Generate unique referral code
    const referralCode = `REF-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

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

    // Create Promotion Code in Stripe
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: referralCode,
      max_redemptions: 1,
      metadata: {
        referrer_user_id: user.id,
      },
    });

    // Store referral in database
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: user.id,
        referral_code: referralCode,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code: promotionCode.id,
        status: 'pending',
      });

    if (insertError) {
      console.error('Failed to store referral:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode}`;

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

