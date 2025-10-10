'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/**
 * Hook für Supabase Realtime-Integration mit React Query
 * Invalidiert den Query-Cache bei Realtime-Events
 */
export function useRealtimeVideos(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[useRealtimeVideos] 🔥 REALTIME DEAKTIVIERT - Verwende Polling statt WebSocket');
    
    // 🚨 TEMPORÄR DEAKTIVIERT: Realtime verursacht Verbindungsprobleme
    // Stattdessen verwenden wir Polling + Tab-Focus-Refetch
    // 
    // const channel = supabase
    //   .channel(`videos_realtime_${userId}`)
    //   .on('postgres_changes', { ... }, callback)
    //   .subscribe();

    // Polling als Alternative: Alle 30 Sekunden im Hintergrund refetchen
    const interval = setInterval(() => {
      if (!document.hidden) { // Nur wenn Tab aktiv
        console.log('[useRealtimeVideos] Polling: Refetching videos...');
        queryClient.refetchQueries({ 
          queryKey: ['videos'],
          type: 'active'
        });
      }
    }, 30000); // 30 Sekunden

    return () => {
      console.log('[useRealtimeVideos] Cleaning up polling interval');
      clearInterval(interval);
    };
  }, [userId, queryClient]);
}

/**
 * Hook für Workspace-spezifische Realtime-Updates
 */
export function useRealtimeWorkspaceVideos(ownerId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ownerId) return;

    console.log('[useRealtimeWorkspaceVideos] 🔥 REALTIME DEAKTIVIERT - Verwende Polling für Workspace');
    
    // Polling als Alternative: Alle 30 Sekunden im Hintergrund refetchen
    const interval = setInterval(() => {
      if (!document.hidden) { // Nur wenn Tab aktiv
        console.log('[useRealtimeWorkspaceVideos] Polling: Refetching workspace videos...');
        queryClient.refetchQueries({ 
          queryKey: ['videos', 'workspace', ownerId],
          type: 'active'
        });
      }
    }, 30000); // 30 Sekunden

    return () => {
      console.log('[useRealtimeWorkspaceVideos] Cleaning up workspace polling interval');
      clearInterval(interval);
    };
  }, [ownerId, queryClient]);
}

