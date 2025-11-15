'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { isKosmamediaEmail } from '@/utils/responsiblePeople';

interface ResponsiblePersonAvatarProps {
  responsiblePerson: string | null | undefined; // UUID
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
  className?: string;
}

interface UserProfile {
  id: string;
  firstname?: string;
  lastname?: string;
  email: string;
}

/**
 * Avatar-Komponente für "Verantwortliche Person"
 * 
 * Zeigt entweder:
 * - Kosmamedia Logo (wenn kosmamedia email)
 * - User Initialen (Vorname + Nachname)
 * - Platzhalter (wenn leer)
 */
export default function ResponsiblePersonAvatar({
  responsiblePerson,
  size = 'md',
  showFullName = false,
  className = ''
}: ResponsiblePersonAvatarProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!responsiblePerson) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Check if it's the kosmamedia fallback UUID
      const KOSMAMEDIA_FALLBACK_UUID = '00000000-0000-0000-0000-000000000000';
      if (responsiblePerson === KOSMAMEDIA_FALLBACK_UUID) {
        // Fallback kosmamedia option - create mock profile
        setUserProfile({
          id: KOSMAMEDIA_FALLBACK_UUID,
          email: 'kosmamedia@kosmamedia.de',
          firstname: undefined,
          lastname: undefined
        });
        setLoading(false);
        return;
      }
      
      // Check if responsiblePerson is a UUID (format: 8-4-4-4-12)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(responsiblePerson);

      if (isUUID) {
        // It's a UUID - fetch by ID
        const { data, error } = await supabase
          .from('users')
          .select('id, firstname, lastname, email')
          .eq('id', responsiblePerson)
          .single();

        if (error) {
          console.error('[ResponsiblePersonAvatar] Error fetching user:', error);
          setUserProfile(null);
        } else {
          setUserProfile(data);
        }
      } else {
        // It's a name (legacy data) - handle specially for known names
        if (responsiblePerson.toLowerCase() === 'kosmamedia') {
          // Fetch kosmamedia by email
          const { data, error } = await supabase
            .from('users')
            .select('id, firstname, lastname, email')
            .ilike('email', 'kosmamedia@%')
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('[ResponsiblePersonAvatar] Error fetching kosmamedia:', error);
            setUserProfile(null);
          } else {
            setUserProfile(data);
          }
        } else {
          // For other names, create a mock profile for display
          console.warn('[ResponsiblePersonAvatar] Legacy name found (not UUID):', responsiblePerson);
          setUserProfile({
            id: responsiblePerson,
            email: responsiblePerson,
            firstname: responsiblePerson.split(' ')[0] || responsiblePerson,
            lastname: responsiblePerson.split(' ').slice(1).join(' ') || ''
          });
        }
      }
      
      setLoading(false);
    };

    fetchUserProfile();
  }, [responsiblePerson]);

  // Initialen extrahieren (Vorname + Nachname)
  const getInitials = (user: UserProfile) => {
    if (user.firstname && user.lastname) {
      return (user.firstname[0] + user.lastname[0]).toUpperCase();
    }
    if (user.firstname) return user.firstname[0].toUpperCase();
    return user.email[0].toUpperCase();
  };

  // Graustufen für Profilbilder (schwarz-weiß, nicht bunt)
  const getGrayscaleFromName = (name: string) => {
    const grayscales = [
      'bg-neutral-600',
      'bg-neutral-700',
      'bg-neutral-500',
      'bg-neutral-800',
      'bg-gray-600',
      'bg-gray-700',
      'bg-gray-500',
      'bg-slate-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return grayscales[Math.abs(hash) % grayscales.length];
  };

  const getDisplayName = (user: UserProfile) => {
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user.firstname) return user.firstname;
    return user.email.split('@')[0];
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 font-medium animate-pulse`}>
          ...
        </div>
        {showFullName && <span className="text-neutral-500 text-sm animate-pulse">Lädt...</span>}
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 font-medium`}>
          ?
        </div>
        {showFullName && <span className="text-neutral-500 text-sm">Nicht zugeteilt</span>}
      </div>
    );
  }

  const isKosmamedia = isKosmamediaEmail(userProfile.email);

  if (isKosmamedia) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-white flex items-center justify-center p-1`}>
          <Image
            src="/kosmamedia-logo.svg"
            alt="Kosmamedia"
            width={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
            height={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
            className="w-full h-full object-contain"
          />
        </div>
        {showFullName && <span className="text-neutral-200 text-sm font-medium">kosmamedia</span>}
      </div>
    );
  }

  // User Avatar mit Initialen
  const initials = getInitials(userProfile);
  const displayName = getDisplayName(userProfile);
  const grayscaleClass = getGrayscaleFromName(displayName);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full ${grayscaleClass} flex items-center justify-center text-white font-semibold`}>
        {initials}
      </div>
      {showFullName && <span className="text-neutral-200 text-sm">{displayName}</span>}
    </div>
  );
}

