import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/supabase-admin';

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

    // Get the correct base URL from the request host
    // This ensures we always use the actual domain the user is accessing
    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Check if user already has an active referral code
    const { data: existingReferral } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingReferral) {
      // Return existing referral link
      const referralLink = `${baseUrl}/signup?ref=${existingReferral.referral_code}`;
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

    // Store referral in database (Invoice Ninja doesn't need upfront coupon creation)
    // Discount wird automatisch angewendet bei erster Rechnung via apply-credit API
    const { error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_user_id: user.id,
        referral_code: referralCode,
        discount_amount: 25000, // 250€ in cents (für Invoice Ninja)
        discount_applied: false,
        status: 'pending',
      });

    if (insertError) {
      console.error('[Referrals Generate] Failed to store referral:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;

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

