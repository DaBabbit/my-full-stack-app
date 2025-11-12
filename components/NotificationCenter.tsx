'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Video as VideoIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  video_id: string;
  video_title: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();
    
    // Realtime-Subscription für neue Benachrichtigungen
    const channel = supabase
      .channel('responsibility_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responsibility_notifications',
          filter: `recipient_user_id=eq.${user.id}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('responsibility_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('[NotificationCenter] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('responsibility_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('[NotificationCenter] Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('responsibility_notifications')
        .update({ is_read: true })
        .eq('recipient_user_id', user?.id)
        .eq('is_read', false);
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('[NotificationCenter] Mark all as read error:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('responsibility_notifications')
        .delete()
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('[NotificationCenter] Delete error:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    router.push(`/dashboard/videos`);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)}h`;
    return `vor ${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Benachrichtigungen
                </h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {unreadCount} ungelesen
                  </p>
                )}
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Alle als gelesen
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[24rem] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-8 h-8 text-neutral-600" />
                  </div>
                  <p className="text-neutral-400 text-sm text-center">
                    Keine Benachrichtigungen
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`
                      p-4 border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer transition-colors
                      ${!notification.is_read ? 'bg-blue-500/5' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${!notification.is_read ? 'bg-blue-500/20' : 'bg-neutral-800'}
                      `}>
                        <VideoIcon className={`w-5 h-5 ${!notification.is_read ? 'text-blue-400' : 'text-neutral-400'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm text-white font-medium truncate">
                            {notification.video_title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-xs text-neutral-300 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">
                            {formatTime(notification.created_at)}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

