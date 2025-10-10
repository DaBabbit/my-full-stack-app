'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface EditableCellProps {
  value: string | null | undefined;
  videoId: string;
  field: string;
  onSave: (videoId: string, field: string, value: string) => void;
  editable?: boolean;
  type?: 'text' | 'url' | 'date';
  placeholder?: string;
  isLoading?: boolean;
}

/**
 * Generische Inline-Editing Komponente für Tabellenzellen
 * 
 * Features:
 * - Click-to-edit
 * - Debounced Auto-Save (1 Sekunde)
 * - Enter zum Speichern, Escape zum Abbrechen
 * - Loading-Indicator
 * - Mobile-optimierte Touch-Targets
 */
export default function EditableCell({
  value,
  videoId,
  field,
  onSave,
  editable = true,
  type = 'text',
  placeholder = 'Leer',
  isLoading = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (localValue !== (value || '')) {
      setIsSaving(true);
      try {
        console.log('[EditableCell] 🔄 Attempting to save:', field, localValue);
        await onSave(videoId, field, localValue);
        console.log('[EditableCell] ✅ Successfully saved:', field, localValue);
      } catch (error) {
        console.error('[EditableCell] ❌ Error saving:', error);
        // Revert on error
        setLocalValue(value || '');
        // Throw error weiter für Toast-Notification
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
    clearTimeout(timeoutRef.current);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Debounced auto-save
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (newValue !== (value || '')) {
        setIsSaving(true);
        onSave(videoId, field, newValue);
        setTimeout(() => {
          setIsSaving(false);
          setIsEditing(false);
        }, 300);
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timeoutRef.current);
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!editable) {
    return (
      <div className="text-neutral-300 text-sm py-2 px-3">
        {value || <span className="text-neutral-500">-</span>}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="group relative cursor-text hover:bg-neutral-800/30 px-3 py-2 rounded-lg transition-all duration-200 min-h-[44px] flex items-center"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
      >
        <span className={`text-sm ${value ? 'text-neutral-300' : 'text-neutral-500 italic'}`}>
          {value || placeholder}
        </span>
        {(isSaving || isLoading) && (
          <Loader2 className="w-3 h-3 ml-2 text-neutral-400 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all min-h-[44px]"
        placeholder={placeholder}
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

