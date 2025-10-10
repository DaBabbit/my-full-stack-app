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

    console.log('[useRealtimeVideos] Setting up realtime subscription for user:', userId);

    // Subscribe to all video changes
    const channel = supabase
      .channel(`videos_realtime_${userId}`) // Unique channel name per user
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'videos'
        },
        (payload) => {
          console.log('[useRealtimeVideos] Video update received:', payload.eventType);
          
          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['videos'] });
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeVideos] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[useRealtimeVideos] Unsubscribing from realtime');
      channel.unsubscribe();
    };
  }, [userId]); // queryClient NICHT in Dependencies - es ist stabil
}

/**
 * Hook für Workspace-spezifische Realtime-Updates
 */
export function useRealtimeWorkspaceVideos(ownerId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ownerId) return;

    console.log('[useRealtimeWorkspaceVideos] Setting up subscription for workspace:', ownerId);

    const channel = supabase
      .channel(`workspace_${ownerId}_videos`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `workspace_owner_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('[useRealtimeWorkspaceVideos] Workspace video update:', payload.eventType);
          
          // Invalidate workspace-specific queries
          queryClient.invalidateQueries({ queryKey: ['videos', 'workspace', ownerId] });
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeWorkspaceVideos] Subscription status:', status);
      });

    return () => {
      console.log('[useRealtimeWorkspaceVideos] Unsubscribing from workspace realtime');
      channel.unsubscribe();
    };
  }, [ownerId]); // queryClient NICHT in Dependencies - es ist stabil
}

