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
        console.log('[useSharedWorkspaces] RPC not available, using fallback method');
        
        // Fallback: Fetch owner details via workspace_members where they are the owner
        const ownerPromises = ownerIds.map(async (ownerId) => {
          console.log('[useSharedWorkspaces] Fetching owner for ID:', ownerId);
          
          // Try to get owner data from workspace_members table where this user IS the owner
          const { data: ownerMember, error: memberError } = await supabase
            .from('workspace_members')
            .select('user_id, invitation_email')
            .eq('workspace_owner_id', ownerId)
            .eq('user_id', ownerId)
            .eq('role', 'owner')
            .maybeSingle();
          
          console.log('[useSharedWorkspaces] Owner member entry:', ownerMember, 'Error:', memberError);
          
          if (ownerMember?.invitation_email) {
            // We have the owner's email, try to get their name from auth metadata
            // Since we can't query users table directly, we use the email
            return {
              id: ownerId,
              email: ownerMember.invitation_email,
              firstname: null,
              lastname: null
            };
          }
          
          // Last fallback: use a generic placeholder
          return {
            id: ownerId,
            email: `Workspace Owner`,
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
