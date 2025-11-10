import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { referralCode, userId } = await request.json();

    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: 'Missing referralCode or userId' },
        { status: 400 }
      );
    }

    console.log('[Referral Claim] Attempting to claim referral:', { referralCode, userId });

    // Find the referral with this code
    const { data: referral, error: fetchError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .eq('status', 'pending')
      .is('referred_user_id', null)
      .single();

    if (fetchError || !referral) {
      console.error('[Referral Claim] Referral not found or invalid:', fetchError);
      return NextResponse.json(
        { error: 'Invalid or already used referral code' },
        { status: 404 }
      );
    }

    // Update the referral with the referred user
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        referred_user_id: userId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('[Referral Claim] Failed to update referral:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim referral' },
        { status: 500 }
      );
    }

    console.log('[Referral Claim] Successfully claimed referral:', referral.id, 'Status set to completed');

    return NextResponse.json({
      success: true,
      referralId: referral.id,
    });

  } catch (error) {
    console.error('[Referral Claim] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

