'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/**
 * Hook um die Videocredits des aktuellen Users zu laden
 * 
 * Zählt Videos, die auf "In Bearbeitung (Schnitt)" gesetzt wurden im aktuellen Monat
 * Monatslimit: 12 Videos
 */
export function useVideoCredits(userId?: string) {
  return useQuery({
    queryKey: ['video-credits', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID ist erforderlich');
      }

      // Hole User-Subscription für Abrechnungszeitraum
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('billing_cycle_start, billing_cycle_end, monthly_video_limit')
        .eq('user_id', userId)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('[useVideoCredits] Error loading subscription:', subError);
      }

      // Berechne Abrechnungszeitraum
      const today = new Date();
      let billingStart: Date;
      let billingEnd: Date;

      if (subscription?.billing_cycle_start && subscription?.billing_cycle_end) {
        billingStart = new Date(subscription.billing_cycle_start);
        billingEnd = new Date(subscription.billing_cycle_end);
      } else {
        // Fallback: Aktueller Kalendermonat
        billingStart = new Date(today.getFullYear(), today.getMonth(), 1);
        billingEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      }

      // Hole alle Videos des Users im aktuellen Abrechnungszeitraum
      const { data, error } = await supabase
        .from('videos')
        .select('id, status, created_at, last_updated')
        .eq('user_id', userId)
        .or('status.eq.In Bearbeitung (Schnitt),status.eq.Schnitt abgeschlossen,status.eq.Hochgeladen')
        .gte('created_at', billingStart.toISOString())
        .lte('created_at', billingEnd.toISOString());

      if (error) {
        console.error('[useVideoCredits] Error loading credits:', error);
        throw error;
      }

      // Zähle die Credits (jedes Video in diesen Status = 1 Credit)
      const currentCredits = data?.length || 0;
      const monthlyLimit = subscription?.monthly_video_limit || 12; // Aus DB oder Fallback

      console.log('[useVideoCredits] Credits:', {
        currentCredits,
        monthlyLimit,
        percentage: (currentCredits / monthlyLimit) * 100,
        billingStart: billingStart.toISOString(),
        billingEnd: billingEnd.toISOString(),
        videos: data
      });

      return {
        currentCredits,
        monthlyLimit,
        remaining: monthlyLimit - currentCredits,
        percentage: (currentCredits / monthlyLimit) * 100,
        billingStart: billingStart.toISOString(),
        billingEnd: billingEnd.toISOString()
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
    gcTime: 1000 * 60 * 30, // 30 Minuten im Speicher halten
    refetchOnWindowFocus: true,
  });
}

