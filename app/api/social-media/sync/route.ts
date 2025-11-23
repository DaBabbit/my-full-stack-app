import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mixpostClient } from '@/lib/mixpost-client';

/**
 * POST /api/social-media/sync
 * 
 * Synchronisiert alle Social Media Accounts von Mixpost zu Supabase
 * Wird nach erfolgreichem OAuth-Flow aufgerufen
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    console.log('[social-media/sync] Starting sync for user:', user.id);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Hole alle Accounts von Mixpost
    let mixpostAccounts;
    try {
      mixpostAccounts = await mixpostClient.getAccounts();
      console.log('[social-media/sync] Fetched Mixpost accounts:', mixpostAccounts.length);
    } catch (error) {
      console.error('[social-media/sync] Error fetching from Mixpost:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Mixpost Accounts' },
        { status: 500 }
      );
    }

    // 2. Hole bestehende Supabase Accounts für diesen User
    const { data: existingAccounts } = await supabase
      .from('social_media_accounts')
      .select('mixpost_account_id')
      .eq('user_id', user.id);

    const existingAccountIds = new Set(
      existingAccounts?.map(acc => acc.mixpost_account_id) || []
    );

    // 3. Finde neue Accounts (die noch nicht in Supabase sind)
    const newAccounts = mixpostAccounts.filter(
      acc => !existingAccountIds.has(acc.id)
    );

    console.log('[social-media/sync] New accounts to sync:', newAccounts.length);

    // 4. Füge neue Accounts zu Supabase hinzu
    if (newAccounts.length > 0) {
      const accountsToInsert = newAccounts.map(acc => ({
        user_id: user.id,
        platform: acc.provider.toLowerCase(),
        mixpost_account_id: acc.id,
        platform_username: acc.username || acc.name,
        platform_user_id: acc.data?.id as string || acc.id,
        mixpost_account_data: acc,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_synced: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('social_media_accounts')
        .insert(accountsToInsert);

      if (insertError) {
        console.error('[social-media/sync] Error inserting accounts:', insertError);
        return NextResponse.json(
          { error: 'Fehler beim Speichern der Accounts' },
          { status: 500 }
        );
      }

      console.log('[social-media/sync] Successfully synced accounts');
    }

    // 5. Update last_synced für bestehende Accounts
    if (existingAccounts && existingAccounts.length > 0) {
      const { error: updateError } = await supabase
        .from('social_media_accounts')
        .update({ last_synced: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('mixpost_account_id', Array.from(existingAccountIds));

      if (updateError) {
        console.warn('[social-media/sync] Error updating last_synced:', updateError);
      }
    }

    // 6. Hole aktualisierte Account-Liste
    const { data: updatedAccounts } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    return NextResponse.json({
      success: true,
      synced: newAccounts.length,
      total: updatedAccounts?.length || 0,
      accounts: updatedAccounts
    });

  } catch (error) {
    console.error('[social-media/sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Synchronisieren' },
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
