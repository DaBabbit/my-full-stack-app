'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDisplayName, isKosmamediaEmail, splitDisplayName } from '@/utils/responsiblePeople';

type MemberStatus = 'pending' | 'active' | 'removed';

interface WorkspaceMemberRow {
  id: string;
  user_id: string | null;
  status: MemberStatus;
  permissions: null | {
    can_view?: boolean;
    can_create?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
  };
  invitation_email?: string | null;
  user?: {
    id: string;
    email: string;
    firstname?: string | null;
    lastname?: string | null;
  } | null;
}

export type ResponsiblePersonRole = 'kosmamedia' | 'owner' | 'member';

export interface ResponsiblePersonOption {
  id: string;
  name: string;
  email: string;
  role: ResponsiblePersonRole;
}

const ENV_KOSMAMEDIA_USER_ID = process.env.NEXT_PUBLIC_KOSMAMEDIA_USER_ID || process.env.KOSMAMEDIA_USER_ID;

export function useResponsiblePeople(targetWorkspaceOwnerId?: string | null) {
  const { user, supabase } = useAuth();
  const [options, setOptions] = useState<ResponsiblePersonOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workspaceOwnerId = targetWorkspaceOwnerId ?? user?.id ?? null;

  const fetchResponsiblePeople = useCallback(async () => {
    if (!workspaceOwnerId) {
      setOptions([]);
      setIsLoading(false);
      setError('Kein Workspace Owner verfügbar');
      return;
    }

    setIsLoading(true);
    try {
      const [{ data: ownerData, error: ownerError }, { data: membersData, error: membersError }] = await Promise.all([
        supabase
          .from('users')
          .select('id, firstname, lastname, email')
          .eq('id', workspaceOwnerId)
          .maybeSingle(),
        supabase
          .from('workspace_members')
          .select(`
            id,
            user_id,
            status,
            permissions,
            invitation_email,
            user:workspace_members_user_id_fkey (
              id,
              email,
              firstname,
              lastname
            )
          `)
          .eq('workspace_owner_id', workspaceOwnerId)
          .eq('status', 'active')
      ]);

      if (ownerError) throw ownerError;
      if (membersError) throw membersError;

      const eligibleMembers = (membersData as unknown as WorkspaceMemberRow[] | null)?.filter((member) => {
        if (!member.user_id) return false;
        if (member.user_id === workspaceOwnerId) return false;
        const canEdit = member.permissions?.can_edit;
        // Standardmäßig als editierbar betrachten, sofern nicht explizit false
        return canEdit === undefined ? true : Boolean(canEdit);
      }) ?? [];

      const memberOptions: ResponsiblePersonOption[] = eligibleMembers.map((member) => {
        const email = member.user?.email || member.invitation_email || '';
        return {
          id: member.user_id as string,
          name: buildDisplayName({
            firstname: member.user?.firstname,
            lastname: member.user?.lastname,
            email
          }) || email,
          email,
          role: 'member'
        };
      });

      const excludeIds = new Set<string>([
        workspaceOwnerId,
        ...memberOptions.map((member) => member.id)
      ]);

      const kosmamediaOption = await resolveKosmamediaOption({
        supabase,
        excludeIds,
        fallbackName: 'kosmamedia',
        configuredId: ENV_KOSMAMEDIA_USER_ID || undefined
      });

      const orderedOptions: ResponsiblePersonOption[] = [];
      if (kosmamediaOption) {
        orderedOptions.push(kosmamediaOption);
        excludeIds.add(kosmamediaOption.id);
      }

      if (ownerData) {
        orderedOptions.push({
          id: ownerData.id,
          name: buildDisplayName(ownerData),
          email: ownerData.email || '',
          role: 'owner'
        });
        excludeIds.add(ownerData.id);
      }

      const uniqueMemberOptions = memberOptions
        .filter((member) => !excludeIds.has(member.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

      orderedOptions.push(...uniqueMemberOptions);

      setOptions(orderedOptions);
      setError(null);
    } catch (err) {
      console.error('[useResponsiblePeople] Fehler beim Laden der Zuständigkeiten:', err);
      setOptions([]);
      setError('Zuständige Personen konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, workspaceOwnerId]);

  useEffect(() => {
    fetchResponsiblePeople();
  }, [fetchResponsiblePeople]);

  useEffect(() => {
    if (!workspaceOwnerId) return;

    const channel = supabase
      .channel(`responsible_people_${workspaceOwnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_owner_id=eq.${workspaceOwnerId}`
        },
        () => {
          fetchResponsiblePeople();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceOwnerId, supabase, fetchResponsiblePeople]);

  const personMap = useMemo(() => {
    return Object.fromEntries(
      options.map((option) => {
        const { firstname, lastname } = splitDisplayName(option.name);
        return [
          option.id,
          {
            firstname: firstname || option.name,
            lastname,
            email: option.email
          }
        ];
      })
    );
  }, [options]);

  return {
    options,
    isLoading,
    error,
    refetch: fetchResponsiblePeople,
    personMap
  };
}

async function resolveKosmamediaOption({
  supabase,
  excludeIds,
  fallbackName,
  configuredId
}: {
  supabase: ReturnType<typeof useAuth>['supabase'];
  excludeIds: Set<string>;
  fallbackName: string;
  configuredId?: string;
}): Promise<ResponsiblePersonOption | null> {
  const seenIds = new Set(excludeIds);
  const tryUser = async (id: string | null | undefined) => {
    if (!id || seenIds.has(id)) return null;
    const { data, error } = await supabase
      .from('users')
      .select('id, firstname, lastname, email')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data.email ? data : null;
  };

  if (configuredId) {
    const configuredProfile = await tryUser(configuredId);
    if (configuredProfile) {
      return {
        id: configuredProfile.id,
        name: fallbackName,
        email: configuredProfile.email,
        role: 'kosmamedia'
      };
    }
  }

  const collectCandidates = async (pattern: string, limit = 10) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, firstname, lastname, email')
      .ilike('email', pattern)
      .limit(limit);
    if (error || !data) return [];
    return data;
  };

  const candidateLists = [
    ...(await collectCandidates('kosmamedia@%', 10)),
    ...(await collectCandidates('%@kosmamedia.%', 25))
  ];

  const pickCandidate = (filterFn: (email: string) => boolean) =>
    candidateLists.find((candidate) => {
      if (!candidate.email) return false;
      if (seenIds.has(candidate.id)) return false;
      return filterFn(candidate.email);
    }) || null;

  const strictCandidate = pickCandidate(isKosmamediaEmail);
  const fallbackCandidate = strictCandidate || pickCandidate(() => true);

  if (!fallbackCandidate) {
    return null;
  }

  seenIds.add(fallbackCandidate.id);

  return {
    id: fallbackCandidate.id,
    name: fallbackName,
    email: fallbackCandidate.email,
    role: 'kosmamedia'
  };
}

