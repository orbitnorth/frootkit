/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import { DocsSidebar } from './DocsSidebar.js';

export interface DocsLayoutProps {
  currentPath?: string | undefined;
  currentSlug?: string | undefined;
  children: ComponentChildren;
}

export function DocsLayout({ currentPath, currentSlug, children }: DocsLayoutProps) {
  const activeSlug = currentSlug || currentPath || '/docs';

  return (
    <div class="flex min-h-screen bg-[#030712] text-slate-100">
      {/* Mobile Drawer Overlay */}
      <div
        id="docs-backdrop"
        class="fixed inset-0 bg-black/60 z-40 hidden md:hidden"
        {...{ onclick: 'toggleDocsSidebar()' }}
      />

      {/* LEFT SIDEBAR: NO NAVBAR ON DOCS! Navigation lives here */}
      <DocsSidebar currentSlug={activeSlug} />

      {/* RIGHT MAIN CONTENT AREA */}
      <div class="flex-1 min-w-0 md:ml-72 lg:ml-80 flex flex-col min-h-screen">
        {/* Mobile Top Bar (Only visible on small viewports when sidebar is collapsed) */}
        <div class="md:hidden sticky top-0 z-30 bg-[#070b13]/95 backdrop-blur-md border-b border-slate-800 p-3.5 flex items-center justify-between">
          <button
            type="button"
            class="flex items-center gap-2 text-slate-300 hover:text-white"
            {...{ onclick: 'toggleDocsSidebar()' }}
          >
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span class="text-xs font-semibold">Docs Navigation</span>
          </button>

          <a href="/" class="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1">
            <span>&larr; Home</span>
          </a>
        </div>

        {/* Main Document Body */}
        <main class="flex-1 max-w-4xl w-full mx-auto px-6 py-10 lg:px-12">
          {children}
        </main>

        {/* Minimal Docs Footer */}
        <footer class="mt-auto border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-400">
          <p>
            FrootKit Documentation &bull; Built with Froot SSG & Preact SSR &bull;{' '}
            <a href="https://github.com/orbitnorth/froot" class="text-emerald-400 hover:underline">
              GitHub
            </a>
          </p>
        </footer>
      </div>

      {/* Client-side helper scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          function toggleDocsSidebar() {
            const sidebar = document.getElementById('docs-sidebar');
            const backdrop = document.getElementById('docs-backdrop');
            if (sidebar && backdrop) {
              sidebar.classList.toggle('-translate-x-full');
              backdrop.classList.toggle('hidden');
            }
          }

          function filterDocsNav(query) {
            const q = (query || '').toLowerCase().trim();
            const links = document.querySelectorAll('.doc-nav-link');
            links.forEach(link => {
              const title = link.getAttribute('data-title') || '';
              const parentLi = link.closest('li');
              if (!q || title.includes(q)) {
                if (parentLi) parentLi.style.display = '';
              } else {
                if (parentLi) parentLi.style.display = 'none';
              }
            });
          }

          function copyCode(btn) {
            const pre = btn.closest('.code-card')?.querySelector('pre code');
            if (!pre) return;
            navigator.clipboard.writeText(pre.innerText).then(() => {
              const orig = btn.innerText;
              btn.innerText = 'Copied!';
              setTimeout(() => { btn.innerText = orig; }, 1500);
            });
          }
        `,
        }}
      />
    </div>
  );
}

