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

    // Subscribe to video changes vom eigenen User
    const channel = supabase
      .channel(`videos_realtime_${userId}`) // Unique channel name per user
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${userId}` // Nur eigene Videos
        },
        (payload) => {
          console.log('[useRealtimeVideos] Video update received:', payload.eventType, 'ID:', payload.new?.id || payload.old?.id);
          
          // WICHTIG: 500ms Delay um sicherzustellen dass Supabase die Änderung committed hat
          // Dies verhindert dass der Refetch alte Daten zurückbringt
          setTimeout(() => {
            console.log('[useRealtimeVideos] Invalidating queries after delay');
            queryClient.invalidateQueries({ 
              queryKey: ['videos'],
              refetchType: 'active' // Nur aktive Queries refetchen
            });
          }, 500);
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
          console.log('[useRealtimeWorkspaceVideos] Workspace video update received:', payload.eventType, 'ID:', payload.new?.id || payload.old?.id);
          
          // WICHTIG: 500ms Delay um sicherzustellen dass Supabase die Änderung committed hat
          setTimeout(() => {
            console.log('[useRealtimeWorkspaceVideos] Invalidating workspace queries after delay');
            queryClient.invalidateQueries({ 
              queryKey: ['videos', 'workspace', ownerId],
              refetchType: 'active' // Nur aktive Queries refetchen
            });
          }, 500);
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

