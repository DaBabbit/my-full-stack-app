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
    const { userId } = await request.json();

    console.log('[API Claim Pending] Processing for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get pending_referral_code from DB (using service role to bypass RLS)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('pending_referral_code')
      .eq('id', userId)
      .single();

    console.log('[API Claim Pending] User data:', { 
      hasPendingCode: !!userData?.pending_referral_code,
      error: userError?.message 
    });

    if (userError || !userData?.pending_referral_code) {
      console.log('[API Claim Pending] No pending referral code found');
      return NextResponse.json({ 
        success: false, 
        message: 'No pending referral code' 
      });
    }

    const referralCode = userData.pending_referral_code;
    console.log('[API Claim Pending] Found referral code:', referralCode);

    // Find the referral by code
    const { data: referral, error: refError } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_user_id, status')
      .eq('referral_code', referralCode)
      .single();

    console.log('[API Claim Pending] Referral lookup:', { 
      found: !!referral, 
      referralId: referral?.id,
      error: refError?.message 
    });

    if (refError || !referral) {
      console.error('[API Claim Pending] Referral not found:', refError);
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    // Update referral with referred_user_id and set status to completed
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        referred_user_id: userId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('[API Claim Pending] Failed to update referral:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim referral' },
        { status: 500 }
      );
    }

    console.log('[API Claim Pending] ✅ Referral claimed successfully:', referral.id);

    // Clean up pending_referral_code from user record
    const { error: cleanupError } = await supabaseAdmin
      .from('users')
      .update({ pending_referral_code: null })
      .eq('id', userId);

    if (cleanupError) {
      console.error('[API Claim Pending] Failed to cleanup:', cleanupError);
    } else {
      console.log('[API Claim Pending] ✅ Cleaned up pending_referral_code');
    }

    return NextResponse.json({
      success: true,
      referralId: referral.id,
      message: 'Referral claimed successfully'
    });

  } catch (error: unknown) {
    console.error('[API Claim Pending] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

