// Workspace Collaboration Types

export type WorkspaceRole = 'owner' | 'collaborator' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'removed';

export interface WorkspacePermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface WorkspaceMember {
  id: string;
  workspace_owner_id: string;
  user_id: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  invited_by: string | null;
  invited_at: string;
  status: MemberStatus;
  invitation_token: string | null;
  invitation_email: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    email: string;
    firstname?: string;
    lastname?: string;
  };
}

export interface InviteMemberRequest {
  email: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
}

export interface UpdateMemberPermissionsRequest {
  memberId: string;
  permissions: WorkspacePermissions;
}

// Predefined permission sets
export const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermissions> = {
  owner: {
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
  },
  collaborator: {
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: false,
  },
  viewer: {
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false,
  },
};

