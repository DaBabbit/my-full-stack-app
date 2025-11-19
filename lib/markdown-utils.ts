/**
 * Markdown Utilities
 * 
 * Konvertierung zwischen HTML und Markdown für TipTap Editor
 * Verwendet turndown für HTML → Markdown und native Markdown Parser
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Konfigurierter Turndown Service für HTML → Markdown Konvertierung
 */
const turndownService = new TurndownService({
  headingStyle: 'atx', // ## Heading Style
  codeBlockStyle: 'fenced', // ``` code blocks
  bulletListMarker: '-', // - bullet points
  emDelimiter: '_', // _italic_
  strongDelimiter: '**', // **bold**
  linkStyle: 'inlined', // [text](url)
});

// GitHub Flavored Markdown Support (Tables, Strikethrough, Task Lists)
turndownService.use(gfm);

// Custom Rules für bessere Markdown-Ausgabe
turndownService.addRule('checkbox', {
  filter: (node) => {
    return (
      node.nodeName === 'INPUT' &&
      node.getAttribute('type') === 'checkbox'
    );
  },
  replacement: (content, node) => {
    return (node as HTMLInputElement).checked ? '[x] ' : '[ ] ';
  }
});

/**
 * Konvertiert HTML zu Markdown
 * @param html HTML String vom TipTap Editor
 * @returns Markdown String
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '' || html === '<p></p>') {
    return '';
  }
  
  try {
    const markdown = turndownService.turndown(html);
    return markdown.trim();
  } catch (error) {
    console.error('[Markdown Utils] Fehler bei HTML → Markdown:', error);
    return html; // Fallback: Return original HTML
  }
}

/**
 * Konvertiert Markdown zu HTML (für Initial-Load in TipTap)
 * TipTap kann Markdown nicht direkt laden, daher nutzen wir eine simple Konvertierung
 * oder laden als Plain Text und lassen TipTap damit arbeiten
 * 
 * @param markdown Markdown String
 * @returns HTML String
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    // Basic Markdown → HTML Konvertierung
    let html = markdown;

    // Headings: ## Heading → <h2>Heading</h2>
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold: **text** → <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic: _text_ or *text* → <em>text</em>
    html = html.replace(/\_(.*?)\_/gim, '<em>$1</em>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Links: [text](url) → <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

    // Images: ![alt](url) → <img src="url" alt="alt" />
    html = html.replace(/\!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />');

    // Code blocks: ```...``` → <pre><code>...</code></pre>
    html = html.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');

    // Inline code: `code` → <code>code</code>
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Unordered lists: - item → <ul><li>item</li></ul>
    html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');

    // Ordered lists: 1. item → <ol><li>item</li></ol>
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

    // Task lists: - [ ] item or - [x] item
    html = html.replace(/^\- \[ \] (.+)$/gim, '<li data-checked="false">$1</li>');
    html = html.replace(/^\- \[x\] (.+)$/gim, '<li data-checked="true">$1</li>');

    // Blockquotes: > text → <blockquote>text</blockquote>
    html = html.replace(/^\> (.+)$/gim, '<blockquote>$1</blockquote>');

    // Line breaks: Double newline → <p>
    html = html.replace(/\n\n/g, '</p><p>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`;
    }

    return html;
  } catch (error) {
    console.error('[Markdown Utils] Fehler bei Markdown → HTML:', error);
    // Fallback: Wrap in <p> tag
    return `<p>${markdown}</p>`;
  }
}

/**
 * Validiert ob ein String gültiges Markdown ist
 * @param markdown Markdown String
 * @returns boolean
 */
export function isValidMarkdown(markdown: string): boolean {
  if (!markdown || typeof markdown !== 'string') {
    return false;
  }
  
  // Any string is valid markdown (plain text is valid markdown)
  return true;
}

/**
 * Extrahiert reinen Text aus Markdown (ohne Formatierung)
 * @param markdown Markdown String
 * @returns Plain text
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';
  
  let text = markdown;
  
  // Remove images
  text = text.replace(/\!\[([^\]]*)\]\(([^)]+)\)/g, '');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
  // Remove formatting
  text = text.replace(/[*_~`#]/g, '');
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove blockquotes
  text = text.replace(/^\>\s+/gm, '');
  
  return text.trim();
}

