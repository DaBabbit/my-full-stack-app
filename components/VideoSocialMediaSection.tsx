'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Youtube,
  Instagram,
  Facebook,
  Video as TikTokIcon,
  Linkedin,
  Twitter,
  CheckCircle,
  Loader2,
  Send,
  Calendar,
  Share2,
  AlertCircle
} from 'lucide-react';

interface VideoSocialMediaSectionProps {
  videoId: string;
  videoTitle: string;
  videoStorageLocation?: string;
}

interface SocialMediaAccount {
  id: string;
  platform: string;
  mixpost_account_id: string;
  platform_username: string;
  is_active: boolean;
}

const platformConfig = {
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E1306C' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2' },
  tiktok: { name: 'TikTok', icon: TikTokIcon, color: '#00F2EA' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  twitter: { name: 'X', icon: Twitter, color: '#1DA1F2' }
};

export default function VideoSocialMediaSection({
  videoId,
  videoTitle,
  videoStorageLocation
}: VideoSocialMediaSectionProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState(videoTitle || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch('/api/social-media/accounts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts);
        // Auto-select all accounts
        setSelectedPlatforms(data.accounts.map((acc: SocialMediaAccount) => acc.platform));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Bitte wähle mindestens eine Plattform aus');
      return;
    }

    if (!caption.trim()) {
      alert('Bitte gib eine Caption ein');
      return;
    }

    if (publishMode === 'schedule' && !scheduledDate) {
      alert('Bitte wähle ein Datum für die Veröffentlichung');
      return;
    }

    try {
      setIsPublishing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Sitzung abgelaufen. Bitte melde dich erneut an.');
        return;
      }

      const response = await fetch('/api/social-media/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          videoId,
          caption,
          platforms: selectedPlatforms,
          scheduledAt: publishMode === 'schedule' ? scheduledDate : undefined,
          mediaUrl: videoStorageLocation
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || 'Video erfolgreich veröffentlicht!');
        // Reset form
        setCaption(videoTitle || '');
        setScheduledDate('');
      } else {
        alert(`Fehler: ${data.error}`);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Fehler beim Veröffentlichen des Videos');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center"
      >
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Keine Social Media Accounts verbunden
        </h3>
        <p className="text-neutral-300 mb-4">
          Verbinde deine Social Media Accounts, um Videos automatisch zu veröffentlichen
        </p>
        <a
          href="/profile/social-media"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Accounts verbinden
        </a>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Auf Social Media veröffentlichen
        </h3>
        <p className="text-sm text-neutral-400">
          Wähle Plattformen und schreibe eine Caption für dein Video
        </p>
      </div>

      {/* Platform Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-3">
          Plattformen auswählen
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {accounts.map(account => {
            const config = platformConfig[account.platform as keyof typeof platformConfig];
            const Icon = config?.icon || Share2;
            const isSelected = selectedPlatforms.includes(account.platform);

            return (
              <motion.button
                key={account.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => togglePlatform(account.platform)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-neutral-400'}`} />
                  <div className="text-left flex-1">
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                      {config?.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      @{account.platform_username}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-blue-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Caption / Beschreibung
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Beschreibe dein Video..."
          rows={4}
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        <p className="text-xs text-neutral-500 mt-2">
          {caption.length} / 2200 Zeichen
        </p>
      </div>

      {/* Publish Mode */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-3">
          Veröffentlichung
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setPublishMode('now')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
              publishMode === 'now'
                ? 'bg-green-500/20 border-green-500 text-white'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <Send className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm font-medium">Sofort veröffentlichen</span>
          </button>
          <button
            onClick={() => setPublishMode('schedule')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
              publishMode === 'schedule'
                ? 'bg-purple-500/20 border-purple-500 text-white'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <Calendar className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm font-medium">Für später planen</span>
          </button>
        </div>
      </div>

      {/* Schedule Date */}
      <AnimatePresence>
        {publishMode === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Datum und Uhrzeit
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isPublishing || selectedPlatforms.length === 0 || !caption.trim()}
        className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
          isPublishing || selectedPlatforms.length === 0 || !caption.trim()
            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
            : publishMode === 'now'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Wird veröffentlicht...</span>
          </>
        ) : (
          <>
            {publishMode === 'now' ? <Send className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            <span>
              {publishMode === 'now' ? 'Jetzt veröffentlichen' : 'Für später planen'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
