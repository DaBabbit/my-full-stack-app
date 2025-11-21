'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Youtube,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Video,
  CheckCircle,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { ToastContainer, ToastProps } from '@/components/Toast';

interface SocialMediaAccount {
  id: string;
  platform: string;
  mixpost_account_id: string;
  platform_username: string;
  is_active: boolean;
  connected_at: string;
  last_synced: string | null;
}

const platformConfig = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30'
  },
  tiktok: {
    name: 'TikTok',
    icon: Video,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/30'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/30'
  }
};

export default function SocialMediaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  // Check for success/error params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');

    if (success === 'true' && platform) {
      const config = platformConfig[platform as keyof typeof platformConfig];
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: `${config?.name || platform} erfolgreich verbunden!`,
        duration: 5000
      });
      // Remove query params
      router.replace('/profile/social-media');
      // Reload accounts
      loadAccounts();
    } else if (error) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: `Fehler: ${error}`,
        duration: 5000
      });
      router.replace('/profile/social-media');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadAccounts();
  }, [user, router]);

  const addToast = (toast: ToastProps) => {
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/social-media/accounts');
      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts);
      } else {
        throw new Error(data.error || 'Fehler beim Laden');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: 'Fehler beim Laden der Accounts',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      setConnectingPlatform(platform);
      
      const response = await fetch('/api/social-media/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to OAuth URL
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Fehler beim Starten der Verbindung');
      }
    } catch (error) {
      console.error('Error connecting platform:', error);
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: `Fehler beim Verbinden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        duration: 3000
      });
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string, platform: string) => {
    if (!confirm(`Möchten Sie ${platformConfig[platform as keyof typeof platformConfig]?.name || platform} wirklich trennen?`)) {
      return;
    }

    try {
      setDeletingAccount(accountId);
      
      const response = await fetch('/api/social-media/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          id: Date.now().toString(),
          type: 'success',
          message: 'Account erfolgreich getrennt',
          duration: 3000
        });
        loadAccounts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: 'Fehler beim Trennen des Accounts',
        duration: 3000
      });
    } finally {
      setDeletingAccount(null);
    }
  };

  const getConnectedAccount = (platform: string) => {
    return accounts.find(acc => acc.platform === platform && acc.is_active);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
          >
            ← Zurück zum Profil
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Social Media Accounts</h1>
          <p className="text-neutral-400">
            Verbinde deine Social Media Accounts um Videos automatisch zu veröffentlichen
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {/* YouTube */}
            {Object.entries(platformConfig).map(([platform, config]) => {
              const Icon = config.icon;
              const connectedAccount = getConnectedAccount(platform);
              const isConnecting = connectingPlatform === platform;
              const isDeleting = deletingAccount === connectedAccount?.id;

              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border ${
                    connectedAccount ? config.border : 'border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${config.bg}`}>
                        <Icon className={`w-6 h-6 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                        {connectedAccount ? (
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-neutral-400">
                              @{connectedAccount.platform_username}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500 mt-1">Nicht verbunden</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {connectedAccount ? (
                        <>
                          <button
                            onClick={() => handleDisconnect(connectedAccount.id, platform)}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Trennen
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform)}
                          disabled={isConnecting}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verbinde...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              Verbinden
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-2">ℹ️ So funktioniert&apos;s</h3>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>• Verbinde deine Social Media Accounts mit einem Klick</li>
            <li>• Videos können automatisch nach Fertigstellung veröffentlicht werden</li>
            <li>• Du behältst die volle Kontrolle über deine Accounts</li>
            <li>• Trennen ist jederzeit möglich</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

