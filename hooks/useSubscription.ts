'use client';

import { useEffect, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import debounce from 'lodash/debounce';

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

const checkValidSubscription = (data: Subscription | null): boolean => {
  if (!data) return false;
  return ['active', 'trialing'].includes(data.status) && 
    new Date(data.current_period_end) > new Date();
};

export function useSubscription() {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription with React Query
  const { data: subscriptionData, isLoading: loading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { subscription: null, currentSubscription: null };
      }

      // Get the most recent subscription for this user (regardless of status)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Store the current subscription (regardless of status) for display purposes
      const currentSubscription = data;

      // Check if subscription is truly active (not canceled and period hasn't ended)
      const isValid = checkValidSubscription(data);

      return {
        subscription: isValid ? data : null,
        currentSubscription
      };
    },
    enabled: !!user?.id, // Nur fetchen wenn User vorhanden
    staleTime: 1000 * 30, // 30 Sekunden Cache - Subscription-Status sollte relativ aktuell sein
    gcTime: 1000 * 60 * 5, // 5 Minuten im Cache halten
    refetchOnWindowFocus: true, // Bei Tab-Fokus refetchen für aktuellen Status
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


  const MAX_SYNC_RETRIES = 3;
  const [syncRetries, setSyncRetries] = useState(0);

  const debouncedSyncWithStripe = useCallback(
    debounce(async (subscriptionId: string) => {
      if (syncRetries >= MAX_SYNC_RETRIES) {
        console.log('Max sync retries reached');
        return;
      }

      try {
        const response = await fetch('/api/stripe/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to sync with Stripe');
        }
        
        await fetchSubscription();
        setSyncRetries(0); // Reset retries on success
      } catch (error) {
        console.error('Error syncing with Stripe:', error);
        setError(error instanceof Error ? error.message : 'Failed to sync with Stripe');
        setSyncRetries(prev => prev + 1);
      }
    }, 30000), // 30 second delay between calls
    [fetchSubscription, syncRetries]
  );

  const syncWithStripe = useCallback((subscriptionId: string) => {
    debouncedSyncWithStripe(subscriptionId);
  }, [debouncedSyncWithStripe]);

  // Realtime Subscription Setup - optimiert mit React Query
  useEffect(() => {
    if (!user) return;

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
        async (payload) => {
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
  }, [user, supabase, queryClient]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (subscription?.stripe_subscription_id) {
      // Add a delay before first sync
      timeoutId = setTimeout(() => {
        syncWithStripe(subscription.stripe_subscription_id);
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [syncWithStripe, subscription?.stripe_subscription_id]);

  return {
    subscription,
    currentSubscription,
    isLoading: loading,
    error: error?.message || null,
    syncWithStripe,
    fetchSubscription // Expose fetch function for manual refresh
  };
} 