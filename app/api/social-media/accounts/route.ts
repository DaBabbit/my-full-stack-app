import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/social-media/accounts
 * 
 * Holt alle verbundenen Social Media Accounts des Users
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user via Bearer token
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Get accounts from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: accounts, error: dbError } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', user.id)
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
    // Authenticate user via Bearer token
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify account belongs to user
    const { data: account, error: fetchError } = await supabase
      .from('social_media_accounts')
      .select('mixpost_account_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
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

/**
 * Helper: Authentifiziert User via Bearer Token
 */
async function authenticateUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { user: null, error: 'Supabase-Konfiguration fehlt' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Kein Authorization Header' };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || 'Ungültiger Token' };
  }

  return { user, error: null };
}
