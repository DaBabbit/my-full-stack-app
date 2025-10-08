'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Globaler Cache außerhalb der Komponente für bessere Performance
const subscriptionCache = new Map<string, {data: Subscription | null, timestamp: number}>();
const CACHE_DURATION = 30000; // 30 seconds

export function useSubscription() {
  const { user, supabase } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchSubscription = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setSubscription(null);
      setCurrentSubscription(null);
      setLoading(false);
      return;
    }

    // Verhindere mehrfache gleichzeitige Fetches
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }

    // Check cache first (außer bei forceRefresh)
    if (!forceRefresh) {
      const cached = subscriptionCache.get(user.id);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp < CACHE_DURATION)) {
        setSubscription(cached.data);
        setLoading(false);
        return;
      }
    }

    isFetchingRef.current = true;
    
    try {
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
      setCurrentSubscription(data);

      // Check if subscription is truly active (not canceled and period hasn't ended)
      const isValid = data && 
        ['active', 'trialing'].includes(data.status) && 
        new Date(data.current_period_end) > new Date();

      const result = isValid ? data : null;
      
      // Update cache
      subscriptionCache.set(user.id, {
        data: result,
        timestamp: Date.now()
      });
      
      setSubscription(result);
      setError(null);
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setError('Failed to load subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id, supabase]);

  // Initiales Laden - sofort beim Mount starten
  useEffect(() => {
    // Sofort starten ohne Verzögerung
    fetchSubscription();
    
    // Optional: Periodisches Refresh alle 60 Sekunden für lange Sessions
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSubscription(true); // Force refresh
      }
    }, 60000); // 60 Sekunden
    
    return () => clearInterval(intervalId);
  }, [fetchSubscription]);

  const checkValidSubscription = useCallback((data: Subscription[]): boolean => {
    return data.some(sub => 
      ['active', 'trialing'].includes(sub.status) &&
      new Date(sub.current_period_end) > new Date()
    );
  }, []);

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

  // Realtime Subscription Setup - optimiert
  useEffect(() => {
    if (!user) return;

    let channel = supabase
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
          console.log('Subscription realtime update received:', payload);
          const isValid = checkValidSubscription([payload.new as Subscription]);
          setSubscription(isValid ? payload.new as Subscription : null);
          setCurrentSubscription(payload.new as Subscription);
          
          // Clear cache on update
          subscriptionCache.delete(user.id);
          
          if (!isValid) {
            console.log('Subscription expired or invalidated');
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription channel status:', status);
      });

    // Handle visibility changes - reconnect Realtime when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing subscription...');
        
        // Refresh subscription data mit force refresh
        await fetchSubscription(true);
        
        // Reconnect realtime channel
        await supabase.removeChannel(channel);
        channel = supabase
          .channel(`subscription_updates_${user.id}_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'subscriptions',
              filter: `user_id=eq.${user.id}`
            },
            async (payload) => {
              console.log('Subscription realtime update received:', payload);
              const isValid = checkValidSubscription([payload.new as Subscription]);
              setSubscription(isValid ? payload.new as Subscription : null);
              setCurrentSubscription(payload.new as Subscription);
              subscriptionCache.delete(user.id);
              
              if (!isValid) {
                console.log('Subscription expired or invalidated');
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription channel reconnected:', status);
          });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user, supabase, checkValidSubscription, fetchSubscription]);

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
    error,
    syncWithStripe: useCallback((subscriptionId: string) => {
      debouncedSyncWithStripe(subscriptionId);
    }, [debouncedSyncWithStripe]),
    fetchSubscription // Expose fetch function for manual refresh
  };
} 