'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Eye, Edit } from 'lucide-react';
import { WorkspaceMember } from '@/types/workspace';

interface TeamAvatarStackProps {
  members: WorkspaceMember[];
  currentUserId: string;
}

export default function TeamAvatarStack({ members, currentUserId }: TeamAvatarStackProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const visibleMembers = members.slice(0, 3);
  const remainingCount = members.length - 3;

  const getInitials = (member: WorkspaceMember) => {
    const user = member.user;
    if (user?.firstname && user?.lastname) {
      return `${user.firstname[0]}${user.lastname[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || '?';
  };

  const getRoleIcon = (member: WorkspaceMember) => {
    if (member.role === 'owner') return Crown;
    if (member.role === 'viewer') return Eye;
    return Edit;
  };

  const getRoleColor = (member: WorkspaceMember) => {
    if (member.role === 'owner') return 'text-yellow-400';
    if (member.role === 'viewer') return 'text-green-400';
    return 'text-blue-400';
  };

  if (members.length === 0) return null;

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center space-x-2 p-2 hover:bg-neutral-800 rounded-xl transition-colors"
      >
        {/* Avatar Stack */}
        <div className="flex -space-x-2">
          {visibleMembers.map((member, index) => {
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div
                key={member.id}
                className={`w-8 h-8 rounded-full border-2 border-neutral-900 flex items-center justify-center text-xs font-medium transition-transform hover:scale-110 ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-700 text-neutral-200'
                }`}
                style={{ zIndex: visibleMembers.length - index }}
              >
                {getInitials(member)}
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div
              className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300"
              style={{ zIndex: 0 }}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Team Icon */}
        <Users className="w-5 h-5 text-neutral-400" />
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-700 shadow-lg z-50 p-4"
          >
            <div className="flex items-center mb-3 pb-3 border-b border-neutral-700">
              <Users className="w-5 h-5 text-neutral-400 mr-2" />
              <h4 className="text-white font-medium">Team-Mitglieder</h4>
              <span className="ml-auto text-neutral-400 text-sm">{members.length}</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => {
                const RoleIcon = getRoleIcon(member);
                const roleColor = getRoleColor(member);
                const isCurrentUser = member.user_id === currentUserId;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center p-2 rounded-lg ${
                      isCurrentUser ? 'bg-blue-500/10' : 'bg-neutral-800/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mr-3 ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-neutral-700 text-neutral-200'
                      }`}
                    >
                      {getInitials(member)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {member.user?.firstname && member.user?.lastname
                          ? `${member.user.firstname} ${member.user.lastname}`
                          : member.user?.email || 'Unbekannt'}
                        {isCurrentUser && (
                          <span className="text-blue-400 text-xs ml-1">(Du)</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2">
                        <RoleIcon className={`w-3 h-3 ${roleColor}`} />
                        <p className="text-neutral-400 text-xs capitalize">
                          {member.role === 'owner' ? 'Besitzer' : 
                           member.role === 'collaborator' ? 'Mitarbeiter' : 
                           'Betrachter'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-700">
              <p className="text-neutral-500 text-xs text-center">
                Verwalte dein Team in den Profileinstellungen
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

