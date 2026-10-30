/**
 * Zero-dependency fast Markdown and Frontmatter Parser for @froot/fullstack.
 * Provides a lightweight Next.js MDX alternative.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { highlightCode } from './highlighter.js';

export interface MarkdownHeading {
  id: string;
  text: string;
  level?: number;
}

export interface ParsedMarkdown {
  frontmatter: Record<string, string>;
  html: string;
  raw: string;
  headings?: MarkdownHeading[];
}

export interface GetDocOptions {
  contentDir?: string;
  candidates?: string[];
  cwd?: string;
  allowNotFound?: boolean;
}

const ESCAPE_REGEX = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_MAP[match] || match);
}

/**
 * Extracts YAML frontmatter headers from markdown files.
 */
export function parseFrontmatter(markdown: string): { frontmatter: Record<string, string>; content: string } {
  const frontmatter: Record<string, string> = {};
  const trimmed = markdown.trimStart();

  if (!trimmed.startsWith('---')) {
    return { frontmatter, content: markdown };
  }

  const endIdx = trimmed.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { frontmatter, content: markdown };
  }

  const headerBlock = trimmed.slice(3, endIdx).trim();
  const content = trimmed.slice(endIdx + 4).trimStart();

  for (const line of headerBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content };
}

/**
 * Converts a Markdown string into clean, semantic HTML.
 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  const codeBuffer: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let tableBuffer: string[] = [];

  function flushTable(): void {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((r) => r.trim()).filter(Boolean);
    tableBuffer = [];
    if (rows.length < 2) return;

    const firstRow = rows[0];
    if (!firstRow) return;

    let html =
      '<div class="table-container my-6 overflow-x-auto rounded-xl border border-white/10 bg-[#070b13]/80 shadow-md">\n' +
      '  <table class="w-full text-left border-collapse text-sm">\n' +
      '    <thead>\n' +
      '      <tr class="border-b border-white/10 bg-white/[0.04]">\n';

    const headers = firstRow
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    for (const h of headers) {
      html += `        <th class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">${formatInline(h)}</th>\n`;
    }
    html += '      </tr>\n    </thead>\n    <tbody class="divide-y divide-white/5">\n';

    for (let i = 2; i < rows.length; i++) {
      const rowLine = rows[i];
      if (!rowLine) continue;
      const cells = rowLine
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      html += '      <tr class="hover:bg-white/[0.02] transition-colors">\n';
      for (const cell of cells) {
        html += `        <td class="px-5 py-3.5 text-slate-300">${formatInline(cell)}</td>\n`;
      }
      html += '      </tr>\n';
    }
    html += '    </tbody>\n  </table>\n</div>';
    output.push(html);
  }

  function flushList(): void {
    if (inList) {
      output.push(`</${inList}>`);
      inList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine;

    // Fenced Code Blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        const rawCode = codeBuffer.join('\n');
        const highlightedHtml = highlightCode(rawCode, codeLang);
        const langClass = codeLang ? ` class="language-${codeLang}"` : '';
        output.push(
          `<div class="code-card my-6 rounded-xl border border-white/10 bg-[#070b13] overflow-hidden shadow-lg">` +
            `<div class="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.03] text-xs text-slate-400 font-mono">` +
              `<span class="text-emerald-400 font-semibold">${codeLang || 'terminal'}</span>` +
              `<button class="copy-btn hover:text-emerald-300 transition-colors text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10" onclick="copyCode(this)">Copy</button>` +
            `</div>` +
            `<pre class="p-4 overflow-x-auto text-sm font-mono leading-relaxed"><code${langClass}>${highlightedHtml}</code></pre>` +
          `</div>`
        );
        inCodeBlock = false;
        codeBuffer.length = 0;
        codeLang = '';
        continue;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('#')) {
      flushList();
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match && match[1] && match[2]) {
        const level = match[1].length;
        const headingText = match[2];
        const text = formatInline(headingText);
        const id = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        output.push(`<h${level} id="${id}">${text}</h${level}>`);
        continue;
      }
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = formatInline(trimmed.slice(1).trim());
      output.push(`<blockquote class="border-l-4 border-emerald-500 pl-4 py-1 my-3 text-slate-300 italic bg-emerald-500/5 rounded-r">${quoteText}</blockquote>`);
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inList !== 'ul') {
        flushList();
        output.push('<ul>');
        inList = 'ul';
      }
      const itemText = formatInline(trimmed.slice(2));
      output.push(`<li>${itemText}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch && olMatch[2]) {
      if (inList !== 'ol') {
        flushList();
        output.push('<ol>');
        inList = 'ol';
      }
      const itemText = formatInline(olMatch[2]);
      output.push(`<li>${itemText}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    output.push(`<p>${formatInline(trimmed)}</p>`);
  }

  flushList();
  flushTable();

  return output.join('\n');
}

function formatInline(text: string): string {
  let res = text;
  res = res.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  res = res.replace(/_([^_]+)_/g, '<em>$1</em>');
  res = res.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return res;
}

/**
 * Extracts document headings { id, text, level } from Markdown text.
 */
export function extractHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const headings: MarkdownHeading[] = [];
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match && match[1] && match[2]) {
        const level = match[1].length;
        const headingRaw = match[2].trim();
        const plainText = headingRaw.replace(/[`*_~]/g, '').trim();
        const id = headingRaw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        headings.push({ id, text: plainText, level });
      }
    }
  }

  return headings;
}

/**
 * Reads a markdown file from disk, parses frontmatter, converts content to HTML,
 * and extracts structured headings.
 */
export async function renderMarkdownFile(filePath: string): Promise<ParsedMarkdown> {
  const resolved = path.resolve(filePath);
  const raw = await fs.readFile(resolved, 'utf8');
  const { frontmatter, content } = parseFrontmatter(raw);
  const html = renderMarkdown(content);
  const headings = extractHeadings(content);
  return { frontmatter, html, raw, headings };
}

/**
 * Searches and parses a markdown document by slug/name.
 * Resolves `${slug}.md` in contentDir (if provided) or candidate directories like
 * `['content/docs', 'web/content/docs', 'docs', 'content']` from cwd and ancestor directories.
 */
export async function getDoc(
  slug: string,
  options?: string | GetDocOptions
): Promise<ParsedMarkdown> {
  const opts: GetDocOptions = typeof options === 'string' ? { contentDir: options } : options || {};
  const cwd = opts.cwd || process.env['FROOT_CWD'] || process.cwd();

  // Normalize slug
  let cleanSlug = (slug || '').trim();
  if (!cleanSlug || cleanSlug === '/') {
    cleanSlug = 'overview';
  }
  cleanSlug = cleanSlug.replace(/^\/+/, '');
  if (cleanSlug.endsWith('.md')) {
    cleanSlug = cleanSlug.slice(0, -3);
  } else if (cleanSlug.endsWith('.mdx')) {
    cleanSlug = cleanSlug.slice(0, -4);
  }

  // Slug variants to check
  const slugVariants = [cleanSlug];
  if (cleanSlug.startsWith('docs/')) {
    slugVariants.push(cleanSlug.slice(5));
  }
  if (cleanSlug === 'overview') {
    slugVariants.push('index', 'readme', 'README');
  } else if (cleanSlug === 'index') {
    slugVariants.push('overview', 'readme', 'README');
  }

  // Determine candidate search directories
  let searchDirs: string[] = [];
  if (opts.contentDir) {
    const rawDir = opts.contentDir;
    searchDirs.push(path.isAbsolute(rawDir) ? rawDir : path.resolve(cwd, rawDir));
  } else {
    const defaultCandidates = opts.candidates || ['content/docs', 'web/content/docs', 'docs', 'content'];

    // Search cwd and up to 4 parent directories (for monorepos & nested workspace packages)
    let currentDir = cwd;
    const searchRoots: string[] = [currentDir];
    for (let i = 0; i < 4; i++) {
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      searchRoots.push(parent);
      currentDir = parent;
    }

    for (const root of searchRoots) {
      for (const cand of defaultCandidates) {
        searchDirs.push(path.resolve(root, cand));
      }
    }
  }

  // Deduplicate search directories
  searchDirs = Array.from(new Set(searchDirs));

  const checkedPaths: string[] = [];

  // Check direct file path if slug contains path separators or is absolute
  if (cleanSlug.includes('/') || cleanSlug.includes('\\') || path.isAbsolute(slug)) {
    const directPath = path.isAbsolute(slug) ? slug : path.resolve(cwd, slug);
    checkedPaths.push(directPath);
    try {
      const stat = await fs.stat(directPath);
      if (stat.isFile()) {
        return await renderMarkdownFile(directPath);
      }
    } catch {
      // continue
    }
  }

  // Search each candidate directory with each slug variant
  for (const dir of searchDirs) {
    for (const variant of slugVariants) {
      const candidates = [
        path.resolve(dir, `${variant}.md`),
        path.resolve(dir, `${variant}.mdx`),
        path.resolve(dir, variant, 'index.md'),
        path.resolve(dir, variant, 'index.mdx'),
        path.resolve(dir, variant),
      ];

      for (const cand of candidates) {
        checkedPaths.push(cand);
        try {
          const stat = await fs.stat(cand);
          if (stat.isFile()) {
            return await renderMarkdownFile(cand);
          }
        } catch {
          // not found, try next
        }
      }
    }
  }

  if (opts.allowNotFound) {
    return null as any;
  }

  const searchedSample = checkedPaths.slice(0, 6).join('\n  - ');
  throw new Error(
    `Markdown document not found for slug "${slug}".\nSearched locations:\n  - ${searchedSample}\n(checked ${checkedPaths.length} candidates)`
  );
}

/**
 * Reads and renders a markdown document by slug or name.
 */
export async function renderDoc(
  slug: string,
  contentDir?: string | GetDocOptions
): Promise<ParsedMarkdown> {
  return getDoc(slug, contentDir);
}

