'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useSharedWorkspaces } from '@/hooks/useSharedWorkspaces';
import { motion, AnimatePresence } from 'framer-motion';

interface SharedWorkspaceSidebarProps {
  collapsed: boolean;
}

export default function SharedWorkspaceSidebar({ collapsed }: SharedWorkspaceSidebarProps) {
  const { sharedWorkspaces, isLoading } = useSharedWorkspaces();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || sharedWorkspaces.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-neutral-700 pt-4">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors mb-2"
      >
        <div className="flex items-center">
          <Users className={`${collapsed ? '' : 'mr-3'} w-5 h-5`} />
          {!collapsed && <span className="text-sm font-medium">Geteilte Workspaces</span>}
        </div>
        {!collapsed && (
          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Workspace List */}
      <AnimatePresence>
        {(isExpanded || collapsed) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 px-2"
          >
            {sharedWorkspaces.map((workspace) => {
              const isActive = pathname.includes(`/workspace/${workspace.workspace_owner_id}`);
              
              return (
                <button
                  key={workspace.id}
                  onClick={() => router.push(`/workspace/${workspace.workspace_owner_id}/videos`)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={collapsed ? workspace.owner_name : ''}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isActive ? 'bg-black text-white' : 'bg-neutral-700 text-white'
                  } ${collapsed ? '' : 'mr-3'} flex-shrink-0`}>
                    {workspace.owner_name.charAt(0).toUpperCase()}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{workspace.owner_name}</p>
                      <p className="text-xs opacity-75 truncate">{workspace.role === 'collaborator' ? 'Mitarbeiter' : 'Betrachter'}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

