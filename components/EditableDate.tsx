'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';

interface EditableDateProps {
  value: string | null | undefined;
  videoId: string;
  onSave: (videoId: string, field: string, value: string) => void;
  editable?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

/**
 * Inline-Editing Komponente für Datum-Felder
 * 
 * Features:
 * - Click-to-edit mit Native Date Picker
 * - Formatierte Anzeige: "DD.MM.YYYY"
 * - Mobile-optimierte native Inputs
 * - Auto-Save bei Änderung
 */
export default function EditableDate({
  value,
  videoId,
  onSave,
  editable = true,
  placeholder = 'Datum wählen',
  isLoading = false,
}: EditableDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value wenn external value sich ändert
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value || '');
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Trigger the native date picker
      inputRef.current.showPicker?.();
    }
  }, [isEditing]);

  // Format date for display: DD.MM.YYYY
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '';
    }
  };

  const handleSave = async () => {
    if (localValue !== (value || '')) {
      setIsSaving(true);
      try {
        await onSave(videoId, 'publication_date', localValue);
      } catch (error) {
        console.error('Error saving date:', error);
        // Revert on error
        setLocalValue(value || '');
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Auto-save immediately on date selection
    if (newValue !== (value || '')) {
      setIsSaving(true);
      onSave(videoId, 'publication_date', newValue);
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
      }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!editable) {
    return (
      <div className="text-neutral-300 text-sm py-2 px-3">
        {formatDate(value) || <span className="text-neutral-500">-</span>}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="group relative cursor-pointer hover:bg-neutral-800/30 px-3 py-2 rounded-lg transition-all duration-200 min-h-[44px] flex items-center gap-2"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
      >
        <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <span className={`text-sm ${value ? 'text-neutral-300' : 'text-neutral-500 italic'}`}>
          {formatDate(value) || placeholder}
        </span>
        {(isSaving || isLoading) && (
          <Loader2 className="w-3 h-3 ml-auto text-neutral-400 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        value={localValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all min-h-[44px]"
        disabled={isSaving || isLoading}
      />
      {(isSaving || isLoading) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

