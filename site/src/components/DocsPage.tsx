/** @jsxImportSource preact */
import type { DocItem } from '../data/docs-nav.js';

export interface HeadingItem {
  level: number;
  id: string;
  text: string;
}

export interface DocsPageProps {
  title: string;
  category?: string;
  summary?: string;
  markdownHtml: string;
  headings?: HeadingItem[];
  prev?: DocItem;
  next?: DocItem;
}

export function DocsPage({
  title,
  category = 'Documentation',
  summary = '',
  markdownHtml,
  headings = [],
  prev,
  next,
}: DocsPageProps) {
  const filteredHeadings = (headings || []).filter((h) => h.level === 2 || h.level === 3);

  return (
    <div class="relative">
      <div class="xl:mr-64">
        {/* Breadcrumbs */}
        <nav class="flex items-center gap-2 text-xs text-slate-400 mb-6 font-medium">
          <a href="/docs" class="hover:text-emerald-400 transition-colors">
            Docs
          </a>
          <span>/</span>
          <span class="text-slate-300">{category}</span>
          <span>/</span>
          <span class="text-emerald-400">{title}</span>
        </nav>

        {/* Header Block */}
        <header class="mb-10 pb-8 border-b border-slate-800/80">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 mb-4">
            <span>{category}</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            {title}
          </h1>

          {summary && (
            <p class="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl font-normal">
              {summary}
            </p>
          )}
        </header>

        {/* Markdown Rendered Content */}
        <div
          class="prose prose-invert prose-emerald max-w-none text-slate-300"
          dangerouslySetInnerHTML={{ __html: markdownHtml }}
        />

        {/* Prev / Next Pagination Bar */}
        <div class="mt-16 pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prev ? (
            <a
              href={prev.slug}
              class="glass-card rounded-xl p-4 flex flex-col hover:border-emerald-500/50 transition-all group"
            >
              <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 group-hover:text-emerald-400">
                &larr; Previous
              </span>
              <span class="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                {prev.title}
              </span>
            </a>
          ) : (
            <div />
          )}

          {next && (
            <a
              href={next.slug}
              class="glass-card rounded-xl p-4 flex flex-col items-end text-right hover:border-emerald-500/50 transition-all group"
            >
              <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 group-hover:text-emerald-400">
                Next &rarr;
              </span>
              <span class="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                {next.title}
              </span>
            </a>
          )}
        </div>
      </div>

      {/* RIGHT RAIL TABLE OF CONTENTS (On large viewports) */}
      {filteredHeadings.length > 0 && (
        <aside class="hidden xl:block fixed top-20 right-8 w-56 p-4">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 font-mono">
            On this page
          </div>
          <nav class="space-y-1.5 border-l border-slate-800 pl-3">
            {filteredHeadings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                class={`block text-xs transition-colors hover:text-emerald-400 ${
                  h.level === 3
                    ? 'pl-3 text-slate-400 hover:text-slate-200'
                    : 'text-slate-300 font-medium'
                }`}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}

