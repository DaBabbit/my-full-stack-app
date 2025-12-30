'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  // Stripe fields (legacy - optional)
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  // Invoice Ninja fields
  invoice_ninja_client_id?: string;
  invoice_ninja_subscription_id?: string;
  invoice_ninja_invoice_id?: string;
  payment_method?: string;
  gocardless_mandate_id?: string;
  last_api_sync?: string;
  // Common fields
  cancel_at_period_end: boolean;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

const checkValidSubscription = (data: Subscription | null): boolean => {
  if (!data) return false;
  
  // Akzeptiere diese Statuses als "aktiv"
  // 'past_due' = Zahlung steht aus, aber Abo ist noch aktiv (Grace Period)
  // 'paused' = Pausiert, aber nicht gelöscht
  const activeStatuses = ['active', 'trialing', 'past_due'];
  
  return activeStatuses.includes(data.status);
};

export function useSubscription() {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription with React Query + API Polling
  const { data: subscriptionData, isLoading: loading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { subscription: null, currentSubscription: null };
      }

      // 1. Get the most recent subscription for this user
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // 1.5. Auto-Linking: Wenn keine Subscription → Prüfe Invoice Ninja by Email
      if (!data && user.email) {
        console.log('[useSubscription] Keine Subscription → Prüfe Auto-Linking...');
        
        try {
          const linkResponse = await fetch('/api/invoice-ninja/link-existing-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.id, 
              userEmail: user.email 
            }),
          });
          
          const linkResult = await linkResponse.json();
          
          if (linkResult.found && linkResult.linked) {
            console.log('[useSubscription] ✅ Auto-Linking erfolgreich! Refetching...');
            // Refetch nach Linking
            await queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
            // Return early, nächster Query-Lauf hat dann die Daten
            return { subscription: null, currentSubscription: null };
          } else if (linkResult.found && !linkResult.linked) {
            console.log('[useSubscription] ⚠️  Client gefunden, aber Linking fehlgeschlagen');
          } else {
            console.log('[useSubscription] ℹ️  Kein existierender Client gefunden');
          }
        } catch (linkError) {
          console.error('[useSubscription] Auto-Linking Error:', linkError);
          // Fehler nicht werfen, einfach weitermachen ohne Linking
        }
      }

      // 2. Sync with Invoice Ninja API if needed (alle 5 Minuten)
      if (data?.invoice_ninja_client_id && data?.last_api_sync) {
        const lastSync = new Date(data.last_api_sync);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / 1000 / 60;

        if (diffMinutes > 5) {
          console.log('[useSubscription] Sync mit Invoice Ninja API (>5 Min)...');
          
          // API Call zum Sync (Fire-and-forget, kein await)
          fetch('/api/invoice-ninja/sync-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          }).catch((err) => {
            console.error('[useSubscription] Sync Error:', err);
          });

          // Refetch nach kurzer Verzögerung (500ms)
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
          }, 500);
        }
      }

      // 3. Store the current subscription (regardless of status) for display purposes
      const currentSubscription = data;

      // 4. Check if subscription is truly active
      const isValid = checkValidSubscription(data);

      return {
        subscription: isValid ? data : null,
        currentSubscription
      };
    },
    enabled: !!user?.id, // Nur fetchen wenn User vorhanden
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache (API-Sync erfolgt alle 5 Min)
    gcTime: 1000 * 60 * 10, // 10 Minuten im Cache halten
    refetchOnWindowFocus: true, // Bei Tab-Fokus refetchen
    refetchOnMount: true, // Beim Mount fetchen
    refetchInterval: 60000, // Alle 60 Sekunden im Hintergrund refetchen
  });

  const subscription = subscriptionData?.subscription || null;
  const currentSubscription = subscriptionData?.currentSubscription || null;

  const fetchSubscription = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    }
  }, [queryClient, user?.id]);

  // Realtime Subscription Setup - optimiert mit React Query
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`subscription_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          console.log('[useSubscription] Realtime update received, invalidating query...');
          // Invalidate query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
        }
      )
      .subscribe((status) => {
        console.log('[useSubscription] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, queryClient]);

  return {
    subscription,
    currentSubscription,
    isLoading: loading,
    error: error?.message || null,
    fetchSubscription // Expose fetch function for manual refresh
  };
} 