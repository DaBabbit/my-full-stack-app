'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Quote,
  Code,
  CheckSquare,
  Link as LinkIcon,
  ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Loader2,
  Check,
  AlertCircle,
  Upload
} from 'lucide-react';
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown-utils';
import { supabase } from '@/utils/supabase';

interface TipTapEditorProps {
  videoId: string;
  editable?: boolean;
  storageLocation?: string;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function TipTapEditor({ 
  videoId, 
  editable = true,
  storageLocation,
  onSaveSuccess,
  onSaveError
}: TipTapEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Disable link from StarterKit to configure it separately
        link: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:text-blue-300',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'task-item',
        },
        nested: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-neutral-700 px-3 py-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-neutral-700 px-3 py-2 bg-neutral-800 font-semibold',
        },
      }),
      Placeholder.configure({
        placeholder: '## 🎯 Ziel des Videos\nBeschreibe das Ziel oder die Wirkung…\n\n## 📋 Anforderungen\n- Hook für 0–3 Sekunden\n- Branding-Overlay\n- Untertitel aktiv\n\n## 📦 Assets\nFüge Bilder oder Referenzen hinzu',
      }),
    ],
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] max-h-[600px] overflow-y-auto px-4 py-3',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          
          // Check if it's an image
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file, view.state.selection.from);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                handleImageUpload(file, view.state.selection.from);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save debouncing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(editor.getHTML());
      }, 2000); // 2 seconds
    },
  });

  // Load initial content from Nextcloud when editor is ready
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      loadMarkdownContent();
    }
  }, [videoId, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Upload Image to Nextcloud
   */
  const handleImageUpload = async (file: File, position?: number) => {
    if (!storageLocation) {
      console.error('[TipTap] No storage location available');
      if (onSaveError) {
        onSaveError('Kein Speicherort vorhanden. Bitte legen Sie zuerst einen Speicherort fest.');
      }
      return;
    }

    setIsUploadingImage(true);
    console.log('[TipTap] Uploading image:', file.name);

    try {
      // Refresh session before upload to avoid 401
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      let session = currentSession;
      
      if (sessionError || !session) {
        console.error('[TipTap] Session error:', sessionError);
        // Try to refresh the session
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        if (!refreshedSession) {
          throw new Error('Keine aktive Session. Bitte neu anmelden.');
        }
        session = refreshedSession;
      }

      console.log('[TipTap] Session valid, uploading...');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('videoId', videoId);

      // Upload to Nextcloud via API (use Bearer token for auth)
      const response = await fetch('/api/nextcloud/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TipTap] Upload failed:', response.status, errorText);
        throw new Error(`Upload fehlgeschlagen: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TipTap] Image uploaded successfully:', data.imageUrl);

      // Insert image into editor at the specified position or current cursor
      if (editor) {
        if (position !== undefined) {
          editor.chain().focus().insertContentAt(position, {
            type: 'image',
            attrs: { src: data.imageUrl },
          }).run();
        } else {
          editor.chain().focus().setImage({ src: data.imageUrl }).run();
        }
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }

    } catch (error) {
      console.error('[TipTap] Image upload error:', error);
      if (onSaveError) {
        onSaveError(error instanceof Error ? error.message : 'Fehler beim Hochladen des Bildes');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  /**
   * Load Markdown content from Nextcloud
   */
  const loadMarkdownContent = async () => {
    if (!editor) {
      console.warn('[TipTap] Editor not ready yet');
      return;
    }

    setIsLoading(true);
    console.log('[TipTap] Loading content for video:', videoId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Keine aktive Session');
      }

      const response = await fetch(`/api/nextcloud/markdown?videoId=${videoId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[TipTap] Load failed:', response.status, errorData);
        
        // If video has no nextcloud_path yet, show template and allow editing
        if (response.status === 404 && errorData.error?.includes('Nextcloud-Pfad')) {
          console.log('[TipTap] Video has no storage location yet, using template');
          // Editor will show placeholder/template - this is OK
          setIsLoading(false);
          return;
        }
        
        throw new Error('Fehler beim Laden der Markdown-Datei');
      }

      const data = await response.json();
      console.log('[TipTap] Loaded markdown content:', data.content?.substring(0, 100));
      
      if (data.content && data.content.trim()) {
        // Convert Markdown to HTML and set in editor
        const html = markdownToHtml(data.content);
        console.log('[TipTap] Converted to HTML:', html.substring(0, 100));
        
        // Ensure editor is ready and set content
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(html);
          setLastSavedContent(data.content);
          console.log('[TipTap] Content set successfully');
        }
      } else {
        console.log('[TipTap] No content found, using template');
      }

    } catch (error) {
      console.error('[TipTap] Load error:', error);
      if (onSaveError) {
        onSaveError('Fehler beim Laden der Anforderungen');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-Save Handler
   */
  const handleAutoSave = async (html: string) => {
    if (!editable) return;

    const markdown = htmlToMarkdown(html);

    // Don't save if content hasn't changed
    if (markdown === lastSavedContent) {
      return;
    }

    // Don't try to save if video has no storage location yet
    if (!storageLocation) {
      console.warn('[TipTap] Cannot save: No storage location set for this video yet');
      return;
    }

    setSaveStatus('saving');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Keine aktive Session');
      }

      const response = await fetch('/api/nextcloud/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          videoId,
          content: markdown,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If video has no nextcloud_path, show helpful message
        if (response.status === 404 && errorData.error?.includes('Nextcloud-Pfad')) {
          console.warn('[TipTap] Cannot save: Video has no storage location yet');
          return; // Don't show error - just skip save
        }
        
        throw new Error('Fehler beim Speichern');
      }

      setLastSavedContent(markdown);
      setSaveStatus('saved');
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('[TipTap] Save error:', error);
      setSaveStatus('error');
      
      if (onSaveError) {
        onSaveError('Fehler beim Speichern der Anforderungen');
      }

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  /**
   * Manual Save (for "Speichern" button)
   */
  const handleManualSave = useCallback(() => {
    if (editor) {
      // Clear any pending auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleAutoSave(editor.getHTML());
    }
  }, [editor]);

  // Expose manual save to parent component
  useEffect(() => {
    if (editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__tipTapManualSave = handleManualSave;
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__tipTapManualSave;
    };
  }, [editor, handleManualSave]);

  /**
   * Toolbar Button Component
   */
  const ToolbarButton = ({ 
    onClick, 
    active, 
    disabled, 
    children, 
    title,
    className 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-lg transition-all
        ${active 
          ? 'bg-white text-black' 
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className || ''}
      `}
    >
      {children}
    </button>
  );

  /**
   * Add Link Handler
   */
  const handleAddLink = () => {
    const url = window.prompt('URL eingeben:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  /**
   * Add Table Handler
   */
  const handleAddTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        <span className="ml-3 text-neutral-400">Lade Anforderungen...</span>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-neutral-700 rounded-2xl bg-neutral-900/50 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-neutral-700 bg-neutral-800/50 p-3 flex flex-wrap gap-2 items-center sticky top-0 z-10">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-neutral-700 pr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Fett (Strg+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursiv (Strg+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-neutral-700 pr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Überschrift 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Überschrift 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Überschrift 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-neutral-700 pr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Aufzählung"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Nummerierte Liste"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Checkliste"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Advanced */}
        <div className="flex gap-1 border-r border-neutral-700 pr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Zitat"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Insert */}
        <div className="flex gap-1 border-r border-neutral-700 pr-2">
          <ToolbarButton
            onClick={handleAddLink}
            active={editor.isActive('link')}
            title="Link einfügen"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setShowImageUpload(!showImageUpload)}
            active={showImageUpload}
            title="Bild einfügen"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleAddTable}
            active={editor.isActive('table')}
            title="Tabelle einfügen (3x3)"
          >
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>


        {/* Undo/Redo */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Rückgängig (Strg+Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Wiederherstellen (Strg+Y)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Save & Upload Status */}
        <div className="ml-auto flex items-center gap-2">
          {isUploadingImage && (
            <div className="flex items-center gap-2 text-purple-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Lädt Bild hoch...</span>
            </div>
          )}
          {!isUploadingImage && saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Speichert...</span>
            </div>
          )}
          {!isUploadingImage && saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Gespeichert</span>
            </div>
          )}
          {!isUploadingImage && saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Fehler</span>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Area (shown when ImageIcon is clicked) */}
      {showImageUpload && (
        <div className="border-b border-neutral-700 bg-neutral-800/50 p-6">
          <div
            onDragEnter={() => setIsDraggingImage(true)}
            onDragLeave={() => setIsDraggingImage(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingImage(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
                setShowImageUpload(false);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
              ${isDraggingImage 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-neutral-600 bg-neutral-900/50 hover:border-neutral-500 hover:bg-neutral-900'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                  setShowImageUpload(false);
                }
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-neutral-200 font-medium">
                  <span className="text-blue-400 underline">Zum Hochladen klicken</span> oder Drag & Drop
                </p>
                <p className="text-neutral-400 text-sm mt-1">Maximale Dateigröße: 5MB</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setShowImageUpload(false)}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
      
      {/* Table Controls - Show when table is active */}
      {editor?.isActive('table') && (
        <div className="border-b border-neutral-700 bg-neutral-800/50 p-2 flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Zeile davor einfügen"
          >
            ↑ Zeile
          </button>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Zeile danach einfügen"
          >
            ↓ Zeile
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Zeile löschen"
          >
            ✕ Zeile
          </button>
          <div className="w-px h-6 bg-neutral-700 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Spalte davor einfügen"
          >
            ← Spalte
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Spalte danach einfügen"
          >
            → Spalte
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-3 py-1.5 hover:bg-neutral-700 rounded text-neutral-300 text-xs transition-colors"
            title="Spalte löschen"
          >
            ✕ Spalte
          </button>
          <div className="w-px h-6 bg-neutral-700 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-3 py-1.5 hover:bg-red-900/50 rounded text-red-400 text-xs transition-colors"
            title="Tabelle löschen"
          >
            ✕ Tabelle
          </button>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Custom Styles for TipTap */}
      <style jsx global>{`
        .ProseMirror {
          color: #d4d4d8;
        }
        
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
          color: #ffffff;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
          color: #ffffff;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.6em;
          margin-bottom: 0.3em;
          color: #ffffff;
        }
        
        .ProseMirror p {
          margin-bottom: 0.75em;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin-bottom: 0.75em;
        }
        
        .ProseMirror ul li {
          list-style-type: disc;
          margin-bottom: 0.25em;
        }
        
        .ProseMirror ol li {
          list-style-type: decimal;
          margin-bottom: 0.25em;
        }
        
        .ProseMirror .task-list {
          list-style: none;
          padding-left: 0;
        }
        
        .ProseMirror .task-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror .task-item > label {
          margin-right: 0.75em;
          margin-top: 0.125em;
          user-select: none;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        
        .ProseMirror .task-item > label > input[type="checkbox"] {
          width: 1.25em;
          height: 1.25em;
          cursor: pointer;
          appearance: none;
          border: 2px solid #525252;
          border-radius: 0.25em;
          background-color: #171717;
          position: relative;
          transition: all 0.15s ease;
        }
        
        .ProseMirror .task-item > label > input[type="checkbox"]:hover {
          border-color: #737373;
          background-color: #262626;
        }
        
        .ProseMirror .task-item > label > input[type="checkbox"]:checked {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .ProseMirror .task-item > label > input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ffffff;
          font-size: 0.9em;
          font-weight: bold;
        }
        
        .ProseMirror .task-item > div {
          flex: 1;
          line-height: 1.5;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #525252;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          color: #a3a3a3;
          font-style: italic;
        }
        
        .ProseMirror code {
          background-color: #262626;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-size: 0.9em;
          color: #fbbf24;
        }
        
        .ProseMirror pre {
          background-color: #171717;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin-bottom: 0.75em;
        }
        
        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
          color: #d4d4d8;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1em 0;
        }
        
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        .ProseMirror .tableWrapper {
          overflow-x: auto;
        }
        
        .ProseMirror a {
          color: #60a5fa;
          text-decoration: underline;
        }
        
        .ProseMirror a:hover {
          color: #93c5fd;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #737373;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

