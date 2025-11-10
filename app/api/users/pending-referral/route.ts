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
    const { userId, referralCode } = await request.json();

    console.log('[API Pending Referral] Storing referral code:', { userId, referralCode });

    if (!userId || !referralCode) {
      return NextResponse.json(
        { error: 'Missing userId or referralCode' },
        { status: 400 }
      );
    }

    // Update using service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ pending_referral_code: referralCode })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('[API Pending Referral] Failed to update:', error);
      return NextResponse.json(
        { error: 'Failed to store referral code', details: error },
        { status: 500 }
      );
    }

    console.log('[API Pending Referral] Successfully stored:', data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API Pending Referral] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

