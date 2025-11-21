'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Youtube,
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  CheckCircle,
  ExternalLink,
  Calendar,
  Loader2
} from 'lucide-react';

interface SocialMediaAccount {
  id: string;
  platform: string;
  mixpost_account_id: string;
  platform_username: string;
  is_active: boolean;
}

interface VideoSocialMediaSectionProps {
  videoId: string;
  storageLocation?: string;
  caption?: string;
}

const platformIcons = {
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Video,
  linkedin: Linkedin,
  twitter: Twitter
};

const platformColors = {
  youtube: 'text-red-500',
  instagram: 'text-pink-500',
  facebook: 'text-blue-500',
  tiktok: 'text-cyan-500',
  linkedin: 'text-blue-600',
  twitter: 'text-gray-400'
};

export function VideoSocialMediaSection({ 
  videoId, 
  storageLocation, 
  caption 
}: VideoSocialMediaSectionProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/social-media/accounts');
      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts.filter((acc: SocialMediaAccount) => acc.is_active));
        // Pre-select all accounts
        setSelectedPlatforms(data.accounts.filter((acc: SocialMediaAccount) => acc.is_active).map((acc: SocialMediaAccount) => acc.platform));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Bitte wähle mindestens eine Plattform aus');
      return;
    }

    if (!caption) {
      alert('Bitte füge eine Caption in den Anforderungen hinzu');
      return;
    }

    try {
      setIsPublishing(true);
      setPublishStatus('idle');

      const response = await fetch('/api/social-media/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          caption,
          platforms: selectedPlatforms,
          scheduledAt: scheduledDate || undefined,
          mediaUrl: storageLocation
        })
      });

      const data = await response.json();

      if (data.success) {
        setPublishStatus('success');
        setTimeout(() => setPublishStatus('idle'), 3000);
      } else {
        setPublishStatus('error');
        alert(data.error || 'Fehler beim Veröffentlichen');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      setPublishStatus('error');
      alert('Fehler beim Veröffentlichen');
    } finally {
      setIsPublishing(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <p className="text-neutral-300 mb-4">
          Keine Social Media Accounts verbunden
        </p>
        <a
          href="/profile/social-media"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Accounts verbinden
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-Publish Toggle */}
      <div className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
        <div>
          <h4 className="text-white font-medium">Automatisch veröffentlichen</h4>
          <p className="text-sm text-neutral-400 mt-1">
            Video automatisch auf ausgewählten Plattformen posten
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Platform Selection */}
      {autoPublish && (
        <>
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <h4 className="text-white font-medium mb-3">Plattformen auswählen</h4>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((account) => {
                const Icon = platformIcons[account.platform as keyof typeof platformIcons];
                const color = platformColors[account.platform as keyof typeof platformColors];
                const isSelected = selectedPlatforms.includes(account.platform);

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => togglePlatform(account.platform)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white font-medium">
                        {account.platform_username}
                      </p>
                      <p className="text-xs text-neutral-400 capitalize">
                        {account.platform}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Date (Optional) */}
          <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
            <h4 className="text-white font-medium mb-3">Zeitplan (optional)</h4>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neutral-400" />
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Leer lassen um sofort zu veröffentlichen
            </p>
          </div>

          {/* Publish Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || selectedPlatforms.length === 0 || !storageLocation}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Veröffentliche...
              </>
            ) : publishStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Erfolgreich veröffentlicht!
              </>
            ) : (
              <>
                Jetzt veröffentlichen ({selectedPlatforms.length} Plattformen)
              </>
            )}
          </button>

          {!storageLocation && (
            <p className="text-sm text-yellow-400 text-center">
              Bitte setze erst einen Speicherort für das Video
            </p>
          )}
        </>
      )}
    </div>
  );
}

