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
  AlertCircle
} from 'lucide-react';
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown-utils';
import { supabase } from '@/utils/supabase';

interface TipTapEditorProps {
  videoId: string;
  editable?: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function TipTapEditor({ 
  videoId, 
  editable = true,
  onSaveSuccess,
  onSaveError
}: TipTapEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
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
    },
    onUpdate: ({ editor }) => {
      // Auto-save debouncing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(editor.getHTML());
      }, 10000); // 10 seconds
    },
  });

  // Load initial content from Nextcloud
  useEffect(() => {
    loadMarkdownContent();
  }, [videoId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Load Markdown content from Nextcloud
   */
  const loadMarkdownContent = async () => {
    setIsLoading(true);
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
        throw new Error('Fehler beim Laden der Markdown-Datei');
      }

      const data = await response.json();
      
      if (data.content) {
        // Convert Markdown to HTML and set in editor
        const html = markdownToHtml(data.content);
        editor?.commands.setContent(html);
        setLastSavedContent(data.content);
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
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
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
      `}
    >
      {children}
    </button>
  );

  /**
   * Add Image Handler
   */
  const handleAddImage = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  };

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
            onClick={() => setShowImageInput(!showImageInput)}
            active={showImageInput}
            title="Bild einfügen"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleAddTable}
            active={editor.isActive('table')}
            title="Tabelle einfügen"
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

        {/* Save Status */}
        <div className="ml-auto flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Speichert...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Gespeichert</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Fehler</span>
            </div>
          )}
        </div>
      </div>

      {/* Image Input (shown when ImageIcon is clicked) */}
      {showImageInput && (
        <div className="border-b border-neutral-700 bg-neutral-800/50 p-3 flex gap-2">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Bild-URL eingeben..."
            className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Einfügen
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImageInput(false);
              setImageUrl('');
            }}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm transition-colors"
          >
            Abbrechen
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
          margin-bottom: 0.25em;
        }
        
        .ProseMirror .task-item > label {
          margin-right: 0.5em;
          user-select: none;
        }
        
        .ProseMirror .task-item > div {
          flex: 1;
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

