'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface SharedWorkspace {
  workspace_owner_id: string;
  owner_name: string;
  owner_email: string;
  permissions: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  joined_at: string;
}

export function useSharedWorkspaces() {
  const { user } = useAuth();
  const [sharedWorkspaces, setSharedWorkspaces] = useState<SharedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSharedWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setSharedWorkspaces([]);
      setIsLoading(false);
      return;
    }

    try {
      const { supabase } = await import('@/utils/supabase');
      
      console.log('[useSharedWorkspaces] Fetching shared workspaces for user:', user.id);

      // Fetch active workspace memberships with owner details
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_owner_id,
          permissions,
          invited_at,
          users!workspace_members_workspace_owner_id_fkey (
            id,
            email,
            firstname,
            lastname
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('workspace_owner_id', user.id); // Exclude own workspace

      if (error) {
        console.error('[useSharedWorkspaces] Error fetching workspaces:', error);
        setSharedWorkspaces([]);
        return;
      }

      console.log('[useSharedWorkspaces] Raw memberships:', memberships);

      // Transform data
      const workspaces: SharedWorkspace[] = (memberships || []).map((membership: any) => {
        const owner = membership.users;
        const ownerName = owner?.firstname && owner?.lastname
          ? `${owner.firstname} ${owner.lastname}`
          : owner?.email || 'Unbekannt';

        return {
          workspace_owner_id: membership.workspace_owner_id,
          owner_name: ownerName,
          owner_email: owner?.email || '',
          permissions: membership.permissions,
          joined_at: membership.invited_at
        };
      });

      console.log('[useSharedWorkspaces] Transformed workspaces:', workspaces);

      setSharedWorkspaces(workspaces);
    } catch (error) {
      console.error('[useSharedWorkspaces] Error:', error);
      setSharedWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSharedWorkspaces();
  }, [fetchSharedWorkspaces]);

  return {
    sharedWorkspaces,
    isLoading,
    refetch: fetchSharedWorkspaces
  };
}
