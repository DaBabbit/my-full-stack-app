import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    console.log('[Referral List API] Request received');
    
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Referral List API] No auth header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('[Referral List API] User auth:', { userId: user?.id, hasError: !!authError });
    
    if (authError || !user) {
      console.log('[Referral List API] Auth failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Referral List API] Fetching referrals for referrer:', user.id);

    // Get all referrals for this user with referred user details
    const { data: referrals, error: fetchError } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        referral_code,
        status,
        first_payment_received,
        reward_amount,
        created_at,
        completed_at,
        rewarded_at,
        referred_user:users!referred_user_id(
          id,
          firstname,
          lastname,
          email
        )
      `)
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('[Referral List API] Query result:', { 
      count: referrals?.length || 0,
      hasError: !!fetchError,
      error: fetchError?.message 
    });

    if (fetchError) {
      console.error('[Referral List] Error fetching referrals:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch referrals' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedReferrals = referrals.map(referral => {
      const referredUserData = Array.isArray(referral.referred_user)
        ? referral.referred_user[0]
        : referral.referred_user;

      return {
        id: referral.id,
        referralCode: referral.referral_code,
        status: referral.status,
        firstPaymentReceived: referral.first_payment_received,
        rewardAmount: referral.reward_amount,
        createdAt: referral.created_at,
        completedAt: referral.completed_at,
        rewardedAt: referral.rewarded_at,
        referredUser: referredUserData ? {
          id: referredUserData.id,
          name: `${referredUserData.firstname || ''} ${referredUserData.lastname || ''}`.trim(),
          email: referredUserData.email,
        } : null,
      };
    });

    console.log('[Referral List API] Returning referrals:', formattedReferrals.length);
    console.log('[Referral List API] Referral details:', JSON.stringify(formattedReferrals, null, 2));

    return NextResponse.json({
      referrals: formattedReferrals,
    });

  } catch (error) {
    console.error('[Referral List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

