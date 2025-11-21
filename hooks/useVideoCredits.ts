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

      // Hole User-Subscription für Abrechnungszeitraum (aus subscriptions-Tabelle)
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('[useVideoCredits] Error loading subscription:', subError);
      }

      // Berechne Abrechnungszeitraum
      const today = new Date();
      let billingStart: Date;
      let billingEnd: Date;

      if (subscription?.current_period_end) {
        // Verwende echten Stripe-Abrechnungszeitraum
        billingEnd = new Date(subscription.current_period_end);
        // Berechne Start als 30 Tage vor Ende (monatliches Abo)
        billingStart = new Date(billingEnd);
        billingStart.setDate(billingStart.getDate() - 30);
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
      const monthlyLimit = 12; // Fester Wert für alle Abos

      console.log('[useVideoCredits] Credits:', {
        currentCredits,
        monthlyLimit,
        percentage: (currentCredits / monthlyLimit) * 100,
        billingStart: billingStart.toISOString(),
        billingEnd: billingEnd.toISOString(),
        subscriptionEnd: subscription?.current_period_end,
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

