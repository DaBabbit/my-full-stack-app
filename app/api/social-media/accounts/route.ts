import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * GET /api/social-media/accounts
 * 
 * Holt alle verbundenen Social Media Accounts des Users
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Get accounts from database
    const { data: accounts, error: dbError } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('connected_at', { ascending: false });

    if (dbError) {
      console.error('[social-media/accounts] Database error:', dbError);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || []
    });
  } catch (error) {
    console.error('[social-media/accounts] Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social-media/accounts
 * 
 * Trennt einen Social Media Account
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Verify account belongs to user
    const { data: account, error: fetchError } = await supabase
      .from('social_media_accounts')
      .select('mixpost_account_id')
      .eq('id', accountId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account nicht gefunden' },
        { status: 404 }
      );
    }

    // Soft delete - set is_active to false
    const { error: updateError } = await supabase
      .from('social_media_accounts')
      .update({ is_active: false })
      .eq('id', accountId);

    if (updateError) {
      console.error('[social-media/accounts] Error deactivating account:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Trennen des Accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account erfolgreich getrennt'
    });
  } catch (error) {
    console.error('[social-media/accounts] Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    );
  }
}

