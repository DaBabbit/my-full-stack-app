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

// Task List Items (TipTap format)
turndownService.addRule('taskListItem', {
  filter: (node) => {
    return (
      node.nodeName === 'LI' &&
      node.getAttribute('data-type') === 'taskItem'
    );
  },
  replacement: (content, node) => {
    const isChecked = node.getAttribute('data-checked') === 'true';
    const checkbox = isChecked ? '[x]' : '[ ]';
    return `- ${checkbox} ${content}\n`;
  }
});

// Fallback for plain checkbox inputs
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

// Custom Rule für TipTap Tabellen (überschreibt GFM falls nötig)
turndownService.addRule('tiptapTable', {
  filter: 'table',
  replacement: function (content, node) {
    const table = node as HTMLTableElement;
    const rows: string[] = [];
    
    // Process all rows
    const allRows = Array.from(table.querySelectorAll('tr'));
    
    allRows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellTexts = cells.map(cell => {
        // Get text content and trim
        const text = (cell.textContent || '').trim();
        // Escape pipes in cell content
        return text.replace(/\|/g, '\\|');
      });
      
      // Build row string
      const rowStr = '| ' + cellTexts.join(' | ') + ' |';
      rows.push(rowStr);
      
      // Add separator after header row (first row with th elements)
      if (rowIndex === 0 && cells.some(cell => cell.nodeName === 'TH')) {
        const separator = '| ' + cells.map(() => '---').join(' | ') + ' |';
        rows.push(separator);
      }
    });
    
    return '\n\n' + rows.join('\n') + '\n\n';
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

    // Tables: Convert Markdown tables to HTML
    // Match pattern: | col1 | col2 |\n| --- | --- |\n| data1 | data2 |
    const tableRegex = /\n\|(.+)\|\n\|[\s\-:|]+\|\n((?:\|.+\|\n?)+)/g;
    html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
      // Parse header
      const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
      
      // Parse body rows
      const rows = bodyRows.trim().split('\n').map((row: string) => 
        row.split('|').map((cell: string) => cell.trim()).filter(Boolean)
      );
      
      // Build HTML table
      let tableHtml = '<table class="border-collapse table-auto w-full">';
      tableHtml += '<colgroup>' + headers.map(() => '<col style="min-width: 25px;">').join('') + '</colgroup>';
      tableHtml += '<tbody>';
      
      // Header row
      tableHtml += '<tr>';
      headers.forEach((header: string) => {
        tableHtml += `<th class="border border-neutral-700 px-3 py-2 bg-neutral-800 font-semibold"><p>${header}</p></th>`;
      });
      tableHtml += '</tr>';
      
      // Body rows
      rows.forEach((row: string[]) => {
        tableHtml += '<tr>';
        row.forEach((cell: string) => {
          tableHtml += `<td class="border border-neutral-700 px-3 py-2"><p>${cell}</p></td>`;
        });
        tableHtml += '</tr>';
      });
      
      tableHtml += '</tbody></table>';
      return '\n' + tableHtml + '\n';
    });

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

    // Process line by line to handle task lists properly
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inTaskList = false;

    lines.forEach((line) => {
      // Check for task list items: - [ ] or - [x]
      const taskMatch = line.match(/^-\s*\[([ x])\]\s*(.*)$/);
      
      if (taskMatch) {
        const isChecked = taskMatch[1] === 'x';
        const content = taskMatch[2];
        
        if (!inTaskList) {
          processedLines.push('<ul data-type="taskList">');
          inTaskList = true;
        }
        
        processedLines.push(
          `<li data-type="taskItem" data-checked="${isChecked}"><label><input type="checkbox" ${isChecked ? 'checked' : ''}><span>${content}</span></label></li>`
        );
      } else {
        if (inTaskList) {
          processedLines.push('</ul>');
          inTaskList = false;
        }
        processedLines.push(line);
      }
    });

    // Close task list if still open
    if (inTaskList) {
      processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

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

