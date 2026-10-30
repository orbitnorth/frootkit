/** @jsxImportSource preact */
import { FROOTKIT_DOCS_NAV } from '../data/docs-nav.js';

export function DocsSidebar({ currentSlug }: { currentSlug: string }) {
  const normCurrent = currentSlug.replace(/\/$/, '') || '/docs';

  return (
    <aside
      id="docs-sidebar"
      class="fixed inset-y-0 left-0 z-50 w-72 lg:w-80 bg-[#070b13] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out -translate-x-full md:translate-x-0"
    >
      {/* Sidebar Header */}
      <div class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
            <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white tracking-tight">Froot<span class="text-emerald-400">Kit</span></span>
            <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">v1.2</span>
          </div>
        </a>

        <a href="/" class="text-xs text-slate-400 hover:text-white transition-colors" title="Back to Home">
          &larr; Home
        </a>
      </div>

      {/* Search Input */}
      <div class="p-4 border-b border-slate-800/80">
        <div class="relative">
          <input
            type="text"
            placeholder="Filter documentation..."
            class="w-full px-3 py-1.5 pl-8 text-xs rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            {...{ oninput: 'filterDocsNav(this.value)' }}
          />
          <svg
            class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Navigation Tree */}
      <nav id="docs-nav-tree" class="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {FROOTKIT_DOCS_NAV.map((cat) => (
          <div key={cat.category} class="space-y-1.5">
            <h4 class="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {cat.category}
            </h4>
            <ul class="space-y-0.5">
              {cat.items.map((item) => {
                const isExact = normCurrent === item.slug || (item.slug === '/docs' && normCurrent === '/docs/overview');
                return (
                  <li key={item.id}>
                    <a
                      href={item.slug}
                      data-title={item.title.toLowerCase()}
                      class={`doc-nav-link flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isExact
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{item.title}</span>
                      {item.badge && (
                        <span class={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isExact ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div class="p-4 border-t border-slate-800/80 bg-[#05080e] flex items-center justify-between text-xs text-slate-400">
        <a
          href="https://github.com/orbitnorth/froot"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>
        <span class="text-[10px] font-mono text-slate-500">Zero JS default</span>
      </div>
    </aside>
  );
}

