'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';
import OnboardingTasks from './OnboardingTasks';
import WorkspaceInvitations from './WorkspaceInvitations';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tasks, completedCount, totalCount, progressPercentage, isLoading } = useOnboarding();
  const { invitations, isLoading: invitationsLoading } = useWorkspaceInvitations();

  // Calculate unread count (incomplete tasks + pending invitations)
  const incompleteTasks = totalCount - completedCount;
  const unreadCount = incompleteTasks + invitations.length;

  // Debug log
  useEffect(() => {
    console.log('[NotificationBell] Rendered with:', {
      invitations: invitations.length,
      incompleteTasks,
      unreadCount,
      isLoading,
      invitationsLoading
    });
  }, [invitations.length, incompleteTasks, unreadCount, isLoading, invitationsLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative notification-bell">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-400 rounded-lg hover:text-white hover:bg-neutral-800 transition-colors"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge - only show if there are incomplete tasks */}
        {unreadCount > 0 && !isLoading && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-black/90 backdrop-blur-md rounded-xl border border-neutral-700 shadow-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-700">
              <h3 className="text-white font-semibold">Benachrichtigungen</h3>
            </div>

            {/* Content */}
            {isLoading || invitationsLoading ? (
              <div className="p-8 flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-white"></span>
              </div>
            ) : unreadCount > 0 ? (
              <>
                {/* Workspace Invitations */}
                {invitations.length > 0 && (
                  <WorkspaceInvitations />
                )}
                
                {/* Onboarding Tasks */}
                {incompleteTasks > 0 && (
                  <OnboardingTasks
                    tasks={tasks}
                    completedCount={completedCount}
                    totalCount={totalCount}
                    progressPercentage={progressPercentage}
                  />
                )}
              </>
            ) : (
              /* Empty State */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-neutral-600" />
                </div>
                <p className="text-neutral-400 text-sm mb-1">
                  Alles erledigt! 🎉
                </p>
                <p className="text-neutral-500 text-xs">
                  Du hast keine neuen Benachrichtigungen
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

