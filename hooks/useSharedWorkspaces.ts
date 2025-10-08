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

      // Fetch owner details for each workspace
      const ownerIds = memberships.map(m => m.workspace_owner_id);
      
      // Try RPC first, fallback to direct query
      let owners: any[] | null = null;
      
      try {
        const { data: rpcOwners, error: rpcError } = await supabase
          .rpc('get_workspace_owner_details', { owner_ids: ownerIds });
        
        if (!rpcError && rpcOwners) {
          owners = rpcOwners;
          console.log('[useSharedWorkspaces] Owners (via RPC):', owners);
        } else {
          throw rpcError || new Error('RPC returned no data');
        }
      } catch (rpcError) {
        console.log('[useSharedWorkspaces] RPC not available, using direct query:', rpcError);
        
        // Fallback: Fetch owners individually
        const ownerPromises = ownerIds.map(async (ownerId) => {
          // Get owner's email from workspace_members invited_by or other source
          const { data: ownerData } = await supabase
            .from('workspace_members')
            .select('users!workspace_members_invited_by_fkey(id, email, firstname, lastname)')
            .eq('workspace_owner_id', ownerId)
            .limit(1)
            .maybeSingle();
          
          console.log('[useSharedWorkspaces] Owner data for', ownerId, ':', ownerData);
          
          // If we have the owner data, return it
          if (ownerData?.users) {
            return ownerData.users;
          }
          
          // Last resort: just use owner_id as identifier
          return {
            id: ownerId,
            email: `User ${ownerId.substring(0, 8)}...`,
            firstname: null,
            lastname: null
          };
        });
        
        owners = await Promise.all(ownerPromises);
        console.log('[useSharedWorkspaces] Fallback owners:', owners);
      }

      // Transform data
      const workspaces: SharedWorkspace[] = memberships.map((membership: any) => {
        const owner = owners?.find((o: any) => o && o.id === membership.workspace_owner_id);
        const ownerName = owner?.firstname && owner?.lastname
          ? `${owner.firstname} ${owner.lastname}`
          : owner?.email || `Workspace ${membership.workspace_owner_id.substring(0, 8)}`;

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
