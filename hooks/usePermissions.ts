'use client';

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';

export interface Permissions {
  canCreateVideos: boolean;
  canEditVideos: boolean;
  canDeleteVideos: boolean;
  canInviteCollaborators: boolean;
  canManageCollaborators: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus: 'active' | 'trialing' | 'expired' | 'none';
  userRole: 'owner' | 'collaborator' | 'viewer' | 'none';
}

export function usePermissions(): Permissions {
  const { subscription, isLoading } = useSubscription();

  const permissions = useMemo((): Permissions => {
    // While loading, assume no permissions to be safe
    if (isLoading) {
      return {
        canCreateVideos: false,
        canEditVideos: false,
        canDeleteVideos: false,
        canInviteCollaborators: false,
        canManageCollaborators: false,
        hasActiveSubscription: false,
        subscriptionStatus: 'none',
        userRole: 'none'
      };
    }

    // Check if subscription is active and valid
    const hasActiveSubscription = subscription && 
      ['active', 'trialing'].includes(subscription.status) && 
      new Date(subscription.current_period_end) > new Date();

    const subscriptionStatus: 'active' | 'trialing' | 'expired' | 'none' = 
      !subscription ? 'none' :
      hasActiveSubscription && subscription.status === 'active' ? 'active' :
      hasActiveSubscription && subscription.status === 'trialing' ? 'trialing' :
      'expired';

    // For now, everyone with active subscription is considered 'owner'
    // Later this will be extended to check actual user roles in database
    const userRole: 'owner' | 'collaborator' | 'viewer' | 'none' = 
      hasActiveSubscription ? 'owner' : 'none';

    return {
      canCreateVideos: !!hasActiveSubscription && userRole === 'owner',
      canEditVideos: !!hasActiveSubscription && ['owner', 'collaborator'].includes(userRole),
      canDeleteVideos: !!hasActiveSubscription && userRole === 'owner',
      canInviteCollaborators: !!hasActiveSubscription && userRole === 'owner',
      canManageCollaborators: !!hasActiveSubscription && userRole === 'owner',
      hasActiveSubscription: !!hasActiveSubscription,
      subscriptionStatus,
      userRole
    };
  }, [subscription, isLoading]);

  return permissions;
}
