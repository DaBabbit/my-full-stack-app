'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface EditableDescriptionProps {
  value: string | null | undefined;
  videoId: string;
  onSave: (videoId: string, field: string, value: string) => void;
  editable?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

/**
 * ContentEditable Komponente für mehrzeilige Beschreibungen
 * 
 * Features:
 * - Contenteditable für natürliches Schreibgefühl
 * - Auto-Resize basierend auf Inhalt
 * - Debounced Auto-Save (1 Sekunde)
 * - Placeholder-Text wenn leer
 * - Mobile-optimierte Touch-Bereiche
 */
export default function EditableDescription({
  value,
  videoId,
  onSave,
  editable = true,
  placeholder = 'Beschreibung hinzufügen...',
  isLoading = false,
}: EditableDescriptionProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update local value wenn external value sich ändert
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value || '');
      if (contentRef.current && contentRef.current.textContent !== (value || '')) {
        contentRef.current.textContent = value || '';
      }
    }
  }, [value, isFocused]);

  // Initial value setzen beim Mount
  useEffect(() => {
    if (contentRef.current && !contentRef.current.textContent) {
      contentRef.current.textContent = value || '';
    }
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.textContent || '';
    setLocalValue(newValue);

    // Debounced auto-save
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      if (newValue !== (value || '')) {
        setIsSaving(true);
        console.log('[EditableDescription] 💾 Saving description:', newValue.substring(0, 50) + '...');
        
        try {
          await onSave(videoId, 'description', newValue);
          console.log('[EditableDescription] ✅ Save successful');
        } catch (error) {
          console.error('[EditableDescription] ❌ Save failed:', error);
          // Revert on error
          setLocalValue(value || '');
          if (contentRef.current) {
            contentRef.current.textContent = value || '';
          }
        } finally {
          setIsSaving(false);
        }
      }
    }, 1000);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Remove placeholder content wenn leer
    if (contentRef.current && contentRef.current.textContent === '') {
      contentRef.current.textContent = '';
    }
  };

  const handleBlur = async () => {
    setIsFocused(false);
    clearTimeout(timeoutRef.current);
    
    // Save immediately on blur if there are unsaved changes
    const currentValue = contentRef.current?.textContent || '';
    if (currentValue !== (value || '')) {
      setIsSaving(true);
      console.log('[EditableDescription] 💾 Saving on blur:', currentValue.substring(0, 50) + '...');
      
      try {
        await onSave(videoId, 'description', currentValue);
        console.log('[EditableDescription] ✅ Save on blur successful');
      } catch (error) {
        console.error('[EditableDescription] ❌ Save on blur failed:', error);
        // Revert on error
        setLocalValue(value || '');
        if (contentRef.current) {
          contentRef.current.textContent = value || '';
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Revert to original value
      if (contentRef.current) {
        contentRef.current.textContent = value || '';
        setLocalValue(value || '');
      }
      contentRef.current?.blur();
      clearTimeout(timeoutRef.current);
    }
    // Allow Enter for new lines (don't prevent default)
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!editable) {
    return (
      <div className="text-neutral-300 text-sm py-2 px-3 whitespace-pre-wrap max-w-xs">
        <div className="truncate" title={value || ''}>
          {value || <span className="text-neutral-500">-</span>}
        </div>
      </div>
    );
  }

  const isEmpty = !localValue && !isFocused;

  return (
    <div className="relative group">
      <div
        ref={contentRef}
        contentEditable={editable && !isLoading && !isSaving}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        dir="ltr"
        className={`
          min-h-[44px] max-h-32 overflow-y-auto
          px-3 py-2 rounded-lg 
          text-sm text-neutral-300
          cursor-text
          transition-all duration-200
          hover:bg-neutral-800/30
          focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-neutral-800
          ${isEmpty ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-500 empty:before:italic' : ''}
          ${(isLoading || isSaving) ? 'opacity-70' : ''}
        `}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
      >
        {/* Kein {localValue} hier - wird über textContent gesetzt! */}
      </div>
      {(isSaving || isLoading) && (
        <div className="absolute right-2 top-2">
          <Loader2 className="w-3 h-3 text-neutral-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

