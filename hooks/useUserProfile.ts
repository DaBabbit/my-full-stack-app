'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  main_storage_location?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Hook um User-Profil aus public.users zu laden
 * Enthält main_storage_location und andere User-Daten
 */
export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[useUserProfile] Error loading profile:', error);
        } else {
          console.log('[useUserProfile] Profile loaded:', data);
          setProfile(data);
        }
      } catch (err) {
        console.error('[useUserProfile] Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  return { profile, isLoading };
}

