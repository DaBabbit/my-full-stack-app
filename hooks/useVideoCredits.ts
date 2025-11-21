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

      // Hole alle Videos des Users, die "In Bearbeitung (Schnitt)" sind oder waren
      // und im aktuellen Monat erstellt/bearbeitet wurden
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('videos')
        .select('id, status, created_at, last_updated')
        .eq('user_id', userId)
        .or('status.eq.In Bearbeitung (Schnitt),status.eq.Schnitt abgeschlossen,status.eq.Hochgeladen')
        .gte('created_at', startOfMonth.toISOString());

      if (error) {
        console.error('[useVideoCredits] Error loading credits:', error);
        throw error;
      }

      // Zähle die Credits (jedes Video in diesen Status = 1 Credit)
      const currentCredits = data?.length || 0;
      const monthlyLimit = 12; // Fester Wert

      console.log('[useVideoCredits] Credits:', {
        currentCredits,
        monthlyLimit,
        percentage: (currentCredits / monthlyLimit) * 100,
        videos: data
      });

      return {
        currentCredits,
        monthlyLimit,
        remaining: monthlyLimit - currentCredits,
        percentage: (currentCredits / monthlyLimit) * 100
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
    gcTime: 1000 * 60 * 30, // 30 Minuten im Speicher halten
    refetchOnWindowFocus: true,
  });
}

