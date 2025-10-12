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

    console.log('[useRealtimeVideos] 📡 Setting up Realtime subscription for user:', userId);
    
    // Echtes Supabase Realtime (kein Polling!)
    const channel = supabase
      .channel(`videos_realtime_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'videos', 
          filter: `user_id=eq.${userId}` // Server-side filter
        },
        (payload: any) => {
          console.log('[useRealtimeVideos] 📡 Realtime event received:', payload.eventType);
          console.log('[useRealtimeVideos] 📦 Payload:', payload.new || payload.old);
          
          // Nur Cache invalidieren, NICHT refetchen (React Query macht das automatisch)
          queryClient.invalidateQueries({ 
            queryKey: ['videos', 'own'],
            refetchType: 'none' // Wichtig: Kein sofortiger Refetch
          });
          
          console.log('[useRealtimeVideos] ✅ Cache invalidated - React Query will refetch when needed');
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeVideos] 🔌 Connection status:', status);
      });
    
    return () => {
      console.log('[useRealtimeVideos] 🧹 Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
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

    console.log('[useRealtimeWorkspaceVideos] 📡 Setting up Realtime subscription for workspace:', ownerId);
    
    // Echtes Supabase Realtime für Workspace
    const channel = supabase
      .channel(`workspace_videos_realtime_${ownerId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'videos', 
          filter: `user_id=eq.${ownerId}` // Filter für Workspace Owner
        },
        (payload: any) => {
          console.log('[useRealtimeWorkspaceVideos] 📡 Realtime event received:', payload.eventType);
          console.log('[useRealtimeWorkspaceVideos] 📦 Payload:', payload.new || payload.old);
          
          // Cache invalidieren
          queryClient.invalidateQueries({ 
            queryKey: ['videos', 'workspace', ownerId],
            refetchType: 'none'
          });
          
          console.log('[useRealtimeWorkspaceVideos] ✅ Workspace cache invalidated');
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeWorkspaceVideos] 🔌 Connection status:', status);
      });
    
    return () => {
      console.log('[useRealtimeWorkspaceVideos] 🧹 Cleaning up workspace Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);
}

