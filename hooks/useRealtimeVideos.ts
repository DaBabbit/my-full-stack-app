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

    if (process.env.NODE_ENV === 'development') {
      console.log('[useRealtimeVideos] 📡 Setting up Realtime subscription for user:', userId);
    }
    
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
          // Nur wichtige Events loggen
          if (payload.new?.storage_location && !payload.old?.storage_location) {
            console.log('[useRealtimeVideos] 🎯 Storage Location hinzugefügt:', payload.new.storage_location);
          } else if (process.env.NODE_ENV === 'development') {
            console.log('[useRealtimeVideos] 📡 Event:', payload.eventType);
          }
          
          // DOPPELT ABSICHERN: Erst invalidieren, dann refetchen
          // Invalidate = Cache als "stale" markieren
          queryClient.invalidateQueries({ 
            queryKey: ['videos', 'own', userId]
          });
          
          // Refetch = Sofort neue Daten holen
          queryClient.refetchQueries({ 
            queryKey: ['videos', 'own', userId],
            type: 'active'
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[useRealtimeVideos] ✅ Cache invalidiert + Refetch gestartet');
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development' || status !== 'SUBSCRIBED') {
          console.log('[useRealtimeVideos] 🔌 Status:', status);
        }
      });
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useRealtimeVideos] 🧹 Cleanup');
      }
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

    if (process.env.NODE_ENV === 'development') {
      console.log('[useRealtimeWorkspaceVideos] 📡 Setting up Realtime subscription for workspace:', ownerId);
    }
    
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
          // Nur wichtige Events loggen
          if (payload.new?.storage_location && !payload.old?.storage_location) {
            console.log('[useRealtimeWorkspaceVideos] 🎯 Storage Location hinzugefügt:', payload.new.storage_location);
          } else if (process.env.NODE_ENV === 'development') {
            console.log('[useRealtimeWorkspaceVideos] 📡 Event:', payload.eventType);
          }
          
          // DOPPELT ABSICHERN: Erst invalidieren, dann refetchen
          queryClient.invalidateQueries({ 
            queryKey: ['videos', 'workspace', ownerId]
          });
          
          queryClient.refetchQueries({ 
            queryKey: ['videos', 'workspace', ownerId],
            type: 'active'
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[useRealtimeWorkspaceVideos] ✅ Cache invalidiert + Refetch gestartet');
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development' || status !== 'SUBSCRIBED') {
          console.log('[useRealtimeWorkspaceVideos] 🔌 Status:', status);
        }
      });
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useRealtimeWorkspaceVideos] 🧹 Cleanup');
      }
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);
}

