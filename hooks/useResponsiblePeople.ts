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
      const [
        { data: ownerData, error: ownerError },
        { data: membersData, error: membersError }
      ] = await Promise.all([
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
            invitation_email
          `)
          .eq('workspace_owner_id', workspaceOwnerId)
          .eq('status', 'active')
      ]);

      if (ownerError) throw ownerError;
      if (membersError) throw membersError;

      console.log('[useResponsiblePeople] Raw membersData:', {
        count: membersData?.length || 0,
        members: (membersData || []).map(m => ({
          id: m.id,
          user_id: m.user_id,
          status: m.status,
          permissions: m.permissions,
          invitation_email: m.invitation_email
        }))
      });
      
      // Detailed log of each member
      (membersData || []).forEach((m, idx) => {
        console.log(`[useResponsiblePeople] Member ${idx + 1}:`, {
          id: m.id,
          user_id: m.user_id,
          status: m.status,
          permissions: m.permissions,
          invitation_email: m.invitation_email
        });
      });

      const memberUserIds = (membersData || [])
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id) && id !== workspaceOwnerId);

      const { data: memberProfiles, error: memberProfilesError } = memberUserIds.length > 0
        ? await supabase
            .from('users')
            .select('id, email, firstname, lastname')
            .in('id', memberUserIds)
        : { data: [], error: null };

      if (memberProfilesError) throw memberProfilesError;

      const userProfileMap = new Map(
        (memberProfiles || []).map(profile => [profile.id, profile])
      );

      // Sammle zuerst alle User IDs mit kosmamedia E-Mail (diese werden später separat als kosmamedia hinzugefügt)
      const kosmamediaUserIds = new Set<string>();
      for (const member of (membersData as WorkspaceMemberRow[] || [])) {
        if (member.user_id && member.invitation_email && isKosmamediaEmail(member.invitation_email)) {
          kosmamediaUserIds.add(member.user_id);
          console.log('[useResponsiblePeople] Found kosmamedia user in members:', member.user_id, member.invitation_email);
        }
      }

      // Filter: Nur aktive Mitglieder mit Bearbeitungsberechtigung
      // Ein Mitglied ist berechtigt wenn:
      // 1. Status ist 'active'
      // 2. user_id ist gesetzt (Einladung wurde angenommen)
      // 3. NICHT der Owner ist
      // 4. NICHT kosmamedia ist (wird separat hinzugefügt)
      // 5. can_edit === true (explizit gesetzt) ODER permissions ist null/undefined (Standard = bearbeitungsberechtigt)
      const eligibleMembers = (membersData as WorkspaceMemberRow[] | null)?.filter((member) => {
        if (!member.user_id) {
          console.log('[useResponsiblePeople] Filtered out - no user_id:', member.id);
          return false;
        }
        if (member.user_id === workspaceOwnerId) {
          console.log('[useResponsiblePeople] Filtered out - is owner:', member.user_id);
          return false;
        }
        if (kosmamediaUserIds.has(member.user_id)) {
          console.log('[useResponsiblePeople] Filtered out - is kosmamedia (will be added separately):', member.user_id);
          return false;
        }
        if (member.status !== 'active') {
          console.log('[useResponsiblePeople] Filtered out - not active:', member.id, member.status);
          return false;
        }
        
        const canEdit = member.permissions?.can_edit;
        // Wenn permissions null/undefined ist, nehmen wir an dass es bearbeitungsberechtigt ist (Standard)
        // Wenn permissions gesetzt ist, muss can_edit explizit true sein
        const isEligible = member.permissions === null || member.permissions === undefined 
          ? true 
          : canEdit === true;
        
        if (!isEligible) {
          console.log('[useResponsiblePeople] Filtered out - no edit permission:', {
            id: member.id,
            permissions: member.permissions,
            can_edit: canEdit
          });
        }
        
        return isEligible;
      }) ?? [];

      console.log('[useResponsiblePeople] Gefundene Mitglieder:', {
        total: membersData?.length || 0,
        eligible: eligibleMembers.length,
        eligibleMembers: eligibleMembers.map(m => ({
          user_id: m.user_id,
          can_edit: m.permissions?.can_edit,
          permissions: m.permissions,
          status: m.status,
          invitation_email: m.invitation_email
        }))
      });
      
      // Detailed log for each eligible member
      eligibleMembers.forEach((m, idx) => {
        console.log(`[useResponsiblePeople] Eligible Member ${idx + 1}:`, {
          user_id: m.user_id,
          permissions: JSON.stringify(m.permissions),
          can_edit: m.permissions?.can_edit,
          status: m.status,
          invitation_email: m.invitation_email
        });
      });

      const memberOptions: ResponsiblePersonOption[] = eligibleMembers.map((member) => {
        const profile = userProfileMap.get(member.user_id as string);
        const email = profile?.email || member.invitation_email || '';
        return {
          id: member.user_id as string,
          name: buildDisplayName({
            firstname: profile?.firstname,
            lastname: profile?.lastname,
            email
          }) || email,
          email,
          role: 'member'
        };
      });

      // excludeIds sollte workspaceOwnerId UND alle kosmamedia User IDs enthalten
      const excludeIds = new Set<string>([workspaceOwnerId, ...kosmamediaUserIds]);

      const kosmamediaOption = await resolveKosmamediaOption({
        supabase,
        excludeIds,
        fallbackName: 'kosmamedia',
        configuredId: ENV_KOSMAMEDIA_USER_ID || undefined,
        workspaceOwnerId,
        kosmamediaUserIds
      });

      const orderedOptions: ResponsiblePersonOption[] = [];
      // kosmamedia muss IMMER vorhanden sein
      if (kosmamediaOption) {
        orderedOptions.push(kosmamediaOption);
        excludeIds.add(kosmamediaOption.id);
        console.log('[useResponsiblePeople] kosmamedia gefunden:', kosmamediaOption);
      } else {
        // Fallback: Virtuelle kosmamedia-Option erstellen
        const fallbackKosmamediaOption: ResponsiblePersonOption = {
          id: '00000000-0000-0000-0000-000000000000', // Feste UUID für kosmamedia Fallback
          name: 'kosmamedia',
          email: 'kosmamedia@kosmamedia.de',
          role: 'kosmamedia'
        };
        orderedOptions.push(fallbackKosmamediaOption);
        excludeIds.add(fallbackKosmamediaOption.id);
        console.warn('[useResponsiblePeople] kosmamedia nicht gefunden, verwende Fallback-Option');
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

      console.log('[useResponsiblePeople] Finale Options-Liste:', {
        total: orderedOptions.length,
        kosmamedia: orderedOptions.find(o => o.role === 'kosmamedia')?.name,
        owner: orderedOptions.find(o => o.role === 'owner')?.name,
        members: orderedOptions.filter(o => o.role === 'member').map(o => o.name),
        allOptions: orderedOptions.map(o => ({
          id: o.id,
          name: o.name,
          role: o.role,
          email: o.email
        }))
      });

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

    console.log('[useResponsiblePeople] Setting up Realtime subscription for workspace:', workspaceOwnerId);

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
        (payload) => {
          console.log('[useResponsiblePeople] Realtime event received:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          // Refetch when workspace members change (invitation accepted, member removed, permissions updated)
          fetchResponsiblePeople();
        }
      )
      .subscribe((status) => {
        console.log('[useResponsiblePeople] Realtime subscription status:', status);
      });

    return () => {
      console.log('[useResponsiblePeople] Cleaning up Realtime subscription');
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
  configuredId,
  workspaceOwnerId,
  kosmamediaUserIds
}: {
  supabase: ReturnType<typeof useAuth>['supabase'];
  excludeIds: Set<string>;
  fallbackName: string;
  configuredId?: string;
  workspaceOwnerId: string;
  kosmamediaUserIds: Set<string>;
}): Promise<ResponsiblePersonOption | null> {
  // Wenn kosmamedia bereits als Member gefunden wurde, verwende diese User ID
  if (kosmamediaUserIds.size > 0) {
    const kosmamediaUserId = Array.from(kosmamediaUserIds)[0]; // Nimm den ersten
    const { data, error } = await supabase
      .from('users')
      .select('id, firstname, lastname, email')
      .eq('id', kosmamediaUserId)
      .maybeSingle();
    
    if (!error && data) {
      console.log('[useResponsiblePeople] Using kosmamedia from members:', data);
      return {
        id: data.id,
        name: fallbackName,
        email: data.email,
        role: 'kosmamedia'
      };
    }
  }

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

  if (fallbackCandidate) {
    seenIds.add(fallbackCandidate.id);
    console.log('[useResponsiblePeople] kosmamedia Account gefunden:', {
      id: fallbackCandidate.id,
      email: fallbackCandidate.email
    });
    return {
      id: fallbackCandidate.id,
      name: fallbackName,
      email: fallbackCandidate.email,
      role: 'kosmamedia'
    };
  }

  // Wenn kein Account gefunden wird, versuche einen kosmamedia-Account zu erstellen
  console.log('[useResponsiblePeople] Versuche kosmamedia-Account zu erstellen...');
  
  // Versuche einen kosmamedia-Account in der users-Tabelle zu erstellen/anlegen
  // Da wir keinen Auth-User erstellen können, verwenden wir einen Fallback mit fester UUID
  // Der Account wird später in Supabase manuell erstellt werden müssen
  // Für jetzt: Verwende Fallback-Option (wird in fetchResponsiblePeople behandelt)
  console.warn('[useResponsiblePeople] kosmamedia-Account nicht gefunden. Fallback wird verwendet.');
  
  return null; // Fallback wird in fetchResponsiblePeople behandelt
}

