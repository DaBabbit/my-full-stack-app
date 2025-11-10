import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { referralCode } = await request.json();

    console.log('[API Referrer Info] Looking up referrer for code:', referralCode);

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Missing referralCode' },
        { status: 400 }
      );
    }

    // Find the referral by code
    const { data: referral, error: refError } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_user_id, referral_code, status')
      .eq('referral_code', referralCode)
      .single();

    if (refError || !referral) {
      console.log('[API Referrer Info] Referral not found:', refError);
      return NextResponse.json(
        { error: 'Referral not found', details: refError },
        { status: 404 }
      );
    }

    // Get the referrer's details
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('users')
      .select('firstname, lastname')
      .eq('id', referral.referrer_user_id)
      .single();

    if (referrerError || !referrerData) {
      console.error('[API Referrer Info] Referrer not found:', referrerError);
      return NextResponse.json(
        { error: 'Referrer not found', details: referrerError },
        { status: 404 }
      );
    }

    console.log('[API Referrer Info] Found referrer:', referrerData);

    return NextResponse.json({
      success: true,
      referrer: {
        firstname: referrerData.firstname,
        lastname: referrerData.lastname,
        fullName: `${referrerData.firstname} ${referrerData.lastname}`
      }
    });
  } catch (error) {
    console.error('[API Referrer Info] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

