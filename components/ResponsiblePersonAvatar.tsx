'use client';

import Image from 'next/image';

interface ResponsiblePersonAvatarProps {
  responsiblePerson: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
  className?: string;
}

/**
 * Avatar-Komponente für "Verantwortliche Person"
 * 
 * Zeigt entweder:
 * - Kosmamedia Logo (wenn "kosmamedia")
 * - User Initialen (wenn User Name)
 * - Platzhalter (wenn leer)
 */
export default function ResponsiblePersonAvatar({
  responsiblePerson,
  size = 'md',
  showFullName = false,
  className = ''
}: ResponsiblePersonAvatarProps) {
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const isKosmamedia = responsiblePerson?.toLowerCase() === 'kosmamedia';
  
  // Initialen extrahieren (Vorname + Nachname)
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Farbe basierend auf Namen generieren (konsistente Farbe pro Name)
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!responsiblePerson) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 font-medium`}>
          ?
        </div>
        {showFullName && <span className="text-neutral-500 text-sm">Nicht zugewiesen</span>}
      </div>
    );
  }

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
        {showFullName && <span className="text-neutral-200 text-sm font-medium">Kosmamedia</span>}
      </div>
    );
  }

  // User Avatar mit Initialen
  const initials = getInitials(responsiblePerson);
  const colorClass = getColorFromName(responsiblePerson);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full ${colorClass} flex items-center justify-center text-white font-semibold`}>
        {initials}
      </div>
      {showFullName && <span className="text-neutral-200 text-sm">{responsiblePerson}</span>}
    </div>
  );
}

