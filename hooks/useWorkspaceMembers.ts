'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceMember, WorkspacePermissions } from '@/types/workspace';

export function useWorkspaceMembers() {
  const { user, supabase } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    if (!user?.id) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is a workspace owner
      const { data: ownerCheck } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('workspace_owner_id', user.id)
        .eq('role', 'owner')
        .single();

      setIsOwner(!!ownerCheck);

      // Fetch members where current user is the owner (including pending invitations)
      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          user:user_id (
            email,
            firstname,
            lastname
          )
        `)
        .eq('workspace_owner_id', user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMembers(data as WorkspaceMember[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching workspace members:', err);
      setError('Fehler beim Laden der Team-Mitglieder');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  // Get members user has access to (as collaborator)
  const fetchAccessibleWorkspaces = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          owner:workspace_owner_id (
            email,
            firstname,
            lastname
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('workspace_owner_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching accessible workspaces:', err);
      return [];
    }
  }, [user?.id, supabase]);

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`workspace_members_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_owner_id=eq.${user.id}`
        },
        () => {
          console.log('Workspace members updated, refreshing...');
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchMembers]);

  // Generate invitation token
  const generateInvitationToken = () => {
    return `inv_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  // Invite member by email
  const inviteMember = useCallback(async (
    email: string,
    permissions: WorkspacePermissions
  ): Promise<{ success: boolean; error?: string; invitationToken?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    if (!isOwner) {
      return { success: false, error: 'Keine Berechtigung zum Einladen' };
    }

    try {
      // Check if user with email exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      const invitationToken = generateInvitationToken();

      if (existingUser) {
        // User exists - check if they are already an owner (has active subscription)
        const { data: isUserOwner } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('workspace_owner_id', existingUser.id)
          .eq('role', 'owner')
          .eq('status', 'active')
          .single();

        if (isUserOwner) {
          return { 
            success: false, 
            error: 'Dieser Benutzer hat bereits ein eigenes Workspace mit aktivem Abo und kann nicht eingeladen werden.' 
          };
        }

        // User exists and is not an owner - create membership
        const { error: insertError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_owner_id: user.id,
            user_id: existingUser.id,
            role: 'collaborator',
            permissions,
            invited_by: user.id,
            status: 'pending',
            invitation_token: invitationToken,
            invitation_email: email
          });

        if (insertError) {
          if (insertError.code === '23505') {
            return { success: false, error: 'Benutzer ist bereits Mitglied dieses Workspaces' };
          }
          throw insertError;
        }
      } else {
        // User doesn't exist yet - create pending invitation without user_id
        // The user_id will be set when they accept the invitation
        const { error: insertError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_owner_id: user.id,
            user_id: user.id, // Temporary - will be updated on acceptance
            role: 'collaborator',
            permissions,
            invited_by: user.id,
            status: 'pending',
            invitation_token: invitationToken,
            invitation_email: email
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      await fetchMembers();
      return { success: true, invitationToken };
    } catch (err) {
      console.error('Error inviting member:', err);
      return { success: false, error: 'Fehler beim Einladen' };
    }
  }, [user?.id, isOwner, supabase, fetchMembers]);

  // Update member permissions
  const updateMemberPermissions = useCallback(async (
    memberId: string,
    permissions: WorkspacePermissions
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id || !isOwner) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({ 
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .eq('workspace_owner_id', user.id);

      if (updateError) throw updateError;

      await fetchMembers();
      return { success: true };
    } catch (err) {
      console.error('Error updating permissions:', err);
      return { success: false, error: 'Fehler beim Aktualisieren' };
    }
  }, [user?.id, isOwner, supabase, fetchMembers]);

  // Remove member
  const removeMember = useCallback(async (
    memberId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id || !isOwner) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
        .eq('workspace_owner_id', user.id)
        .neq('user_id', user.id); // Prevent removing yourself

      if (deleteError) throw deleteError;

      await fetchMembers();
      return { success: true };
    } catch (err) {
      console.error('Error removing member:', err);
      return { success: false, error: 'Fehler beim Entfernen' };
    }
  }, [user?.id, isOwner, supabase, fetchMembers]);

  return {
    members,
    isLoading,
    error,
    isOwner,
    inviteMember,
    updateMemberPermissions,
    removeMember,
    fetchMembers,
    fetchAccessibleWorkspaces
  };
}

