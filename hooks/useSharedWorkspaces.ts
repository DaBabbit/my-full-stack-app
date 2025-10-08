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

      // Fetch active workspace memberships
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('workspace_owner_id, permissions, invited_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('workspace_owner_id', user.id); // Exclude own workspace

      if (error) {
        console.error('[useSharedWorkspaces] Error fetching workspaces:', error);
        setSharedWorkspaces([]);
        return;
      }

      console.log('[useSharedWorkspaces] Raw memberships:', memberships);

      if (!memberships || memberships.length === 0) {
        setSharedWorkspaces([]);
        return;
      }

      // Fetch owner details for each workspace using RPC (bypasses RLS)
      const ownerIds = memberships.map(m => m.workspace_owner_id);
      const { data: owners, error: ownersError } = await supabase
        .rpc('get_workspace_owner_details', { owner_ids: ownerIds });

      if (ownersError) {
        console.error('[useSharedWorkspaces] Error fetching owners:', ownersError);
        // Fallback: try direct query
        const { data: fallbackOwners } = await supabase
          .from('users')
          .select('id, email, firstname, lastname')
          .in('id', ownerIds);
        
        console.log('[useSharedWorkspaces] Fallback owners:', fallbackOwners);
      } else {
        console.log('[useSharedWorkspaces] Owners (via RPC):', owners);
      }

      // Transform data
      const workspaces: SharedWorkspace[] = memberships.map((membership: any) => {
        const owner = owners?.find((o: any) => o.id === membership.workspace_owner_id);
        const ownerName = owner?.firstname && owner?.lastname
          ? `${owner.firstname} ${owner.lastname}`
          : owner?.email || 'Unbekannt';

        console.log('[useSharedWorkspaces] Mapping workspace:', {
          workspace_owner_id: membership.workspace_owner_id,
          owner,
          ownerName
        });

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
