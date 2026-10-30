/** @jsxImportSource preact */
import { highlightCode } from 'frootkit';

const CODE_SNIPPETS: Record<string, string> = {
  layout: `import type { ComponentChildren } from 'preact';

export default function RootLayout({ children }: { children: ComponentChildren }) {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <title>FrootKit App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-[#030712] text-slate-100">
        {children}
      </body>
    </html>
  );
}`,

  page: `import { getDoc } from 'frootkit';

export async function generateStaticParams() {
  return [{ slug: 'overview' }, { slug: 'quickstart' }];
}

export default async function DocPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const { frontmatter, html, headings } = await getDoc(slug);

  return (
    <article class="prose prose-invert">
      <h1>{frontmatter.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}`,

  tailwind: `@import "tailwindcss";

@theme {
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --color-brand-froot: #00e676;
}

@layer components {
  .glass-card {
    background: rgba(13, 19, 31, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}`,

  cli: `# Scaffold a new app
npm create frootkit@latest my-app

cd my-app

# Start development with Tailwind v4 hot reload
npm run dev

# Pre-render static production site (< 1s SSG build)
npm run build

# Start production server
npm run start`,
};

export default function FrootKitLandingPage() {
  return (
    <div class="relative min-h-screen bg-[#030712] text-slate-100 overflow-x-hidden">
      {/* Ambient background glow */}
      <div class="ambient-glow glow-top-left" aria-hidden="true" />
      <div class="ambient-glow glow-top-right" aria-hidden="true" />
      <div class="ambient-glow glow-center" aria-hidden="true" />

      {/* Landing Navbar */}
      <header class="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-white tracking-tight">Froot<span class="text-emerald-400">Kit</span></span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">v1.2.2</span>
            </div>
          </a>

          <nav class="hidden md:flex items-center gap-7 text-sm text-slate-300 font-medium">
            <a href="#features" class="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#benchmarks" class="hover:text-emerald-400 transition-colors">Benchmarks</a>
            <a href="#code" class="hover:text-emerald-400 transition-colors">Code</a>
            <a href="/docs" class="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-semibold">
              <span>Docs</span>
            </a>
          </nav>

          <div class="flex items-center gap-3">
            <a
              href="https://github.com/orbitnorth/froot"
              target="_blank"
              rel="noreferrer"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/50 hover:bg-white/[0.08] hover:text-white transition-all text-slate-200"
            >
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a href="/docs" class="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold btn-primary-glow">
              <span>Explore Docs &rarr;</span>
            </a>
          </div>
        </div>
      </header>

      <main class="relative z-10">
        {/* HERO */}
        <section class="relative pt-20 pb-24 md:pt-28 md:pb-36 bg-grid-pattern">
          <div class="max-w-5xl mx-auto px-6 text-center">
            {/* Announcement Badge */}
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium text-emerald-400 mb-8 backdrop-blur-md">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next.js App Router Parity &bull; Preact SSR &bull; Tailwind CSS v4 Native</span>
            </div>

            {/* Headline */}
            <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              The Hyper-Light<br />
              <span class="gradient-text">Next.js Alternative</span>
            </h1>

            {/* Subtitle */}
            <p class="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
              Next.js App Router conventions with <strong class="text-white font-semibold">3 KB Preact SSR</strong> and native Tailwind CSS v4.
              Zero wrapper boilerplate, instant sub-second builds, and zero mandatory client-side JavaScript.
            </p>

            {/* CTA Group */}
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <div
                class="command-pill cursor-pointer group"
                id="copy-install-box"
                {...{ onclick: 'copyInstallCmd()' }}
                title="Click to copy command"
              >
                <span class="text-emerald-400 font-mono text-sm select-none">$</span>
                <code class="text-xs sm:text-sm font-mono text-slate-200 group-hover:text-white transition-colors" id="install-cmd-text">
                  npm create frootkit@latest
                </code>
                <button
                  type="button"
                  class="ml-1 p-1 rounded-md text-slate-400 group-hover:text-emerald-300 transition-colors"
                  aria-label="Copy install command"
                >
                  <svg id="copy-icon" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <span id="copy-toast" class="hidden text-xs text-emerald-400 font-semibold transition-opacity">
                  Copied!
                </span>
              </div>

              <a href="/docs" class="btn-primary-glow px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                <span>Explore Documentation</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Live Metrics Pill Bar (High Contrast Text) */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto p-5 rounded-2xl bg-[#0b1324] border border-slate-700/80 shadow-2xl shadow-black/50 backdrop-blur-md">
              <div class="p-3 text-center">
                <div class="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-400">
                  ~3 KB
                </div>
                <div class="text-xs uppercase tracking-wider text-slate-300 mt-1.5 font-semibold" style="color: #cbd5e1;">
                  SSR Runtime Footprint
                </div>
              </div>
              <div class="p-3 text-center border-l border-slate-700/80">
                <div class="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  &lt; 1 sec
                </div>
                <div class="text-xs uppercase tracking-wider text-slate-300 mt-1.5 font-semibold" style="color: #cbd5e1;">
                  Full SSG Export
                </div>
              </div>
              <div class="p-3 text-center border-l border-slate-700/80">
                <div class="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-400">
                  0 KB
                </div>
                <div class="text-xs uppercase tracking-wider text-slate-300 mt-1.5 font-semibold" style="color: #cbd5e1;">
                  Mandatory Client JS
                </div>
              </div>
              <div class="p-3 text-center border-l border-slate-700/80">
                <div class="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  100%
                </div>
                <div class="text-xs uppercase tracking-wider text-slate-300 mt-1.5 font-semibold" style="color: #cbd5e1;">
                  App Router Parity
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES BENTO GRID */}
        <section class="py-20 md:py-28 max-w-7xl mx-auto px-6" id="features">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              DEVELOPER ERGONOMICS
            </span>
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-3 mb-4">
              Everything You Love About Next.js, Without the Bloat
            </h2>
            <p class="text-slate-400 text-base sm:text-lg">
              Engineered with Preact SSR and Tailwind CSS v4 to deliver sub-second builds, zero hydration penalty, and clean file-based routing.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-6">
                  <svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Next.js App Router Parity</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Familiar conventions with <code>src/app/layout.tsx</code>, <code>page.tsx</code>, nested directory layouts, and dynamic parameters <code>[slug]</code>.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">src/app</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">Nested Layouts</span>
              </div>
            </div>

            {/* Card 2 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-6">
                  <svg class="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">3 KB Preact SSR</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Swap out bulky 85KB React runtime bundles for Preact’s razor-thin 3KB footprint. Instant first paint and zero mandatory hydration JS.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/25">3KB vs 85KB</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/25">0 Client Churn</span>
              </div>
            </div>

            {/* Card 3 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-6">
                  <svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Native Tailwind CSS v4</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Real CSS-first styling with <code>@theme</code>. Zero PostCSS configuration files and zero runtime script tags. Auto dev watcher included.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-purple-300 bg-purple-500/10 border border-purple-500/25">@theme Native</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-purple-300 bg-purple-500/10 border border-purple-500/25">Zero Config</span>
              </div>
            </div>

            {/* Card 4 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-6">
                  <svg class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Markdown &amp; getDoc()</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Built-in documentation loader. Automatically parses YAML frontmatter, extracts headings for a Table of Contents, and highlights code blocks.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25">getDoc(slug)</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25">Auto TOC</span>
              </div>
            </div>

            {/* Card 5 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-6">
                  <svg class="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Zero-Wrapper Architecture</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  No <code>server.tsx</code>, no <code>build.ts</code>, and no <code>app.tsx</code> cluttering your workspace. Pure CLI orchestration with <code>frootkit dev</code> and <code>build</code>.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-rose-300 bg-rose-500/10 border border-rose-500/25">Zero Clutter</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-rose-300 bg-rose-500/10 border border-rose-500/25">Pure App Code</span>
              </div>
            </div>

            {/* Card 6 */}
            <div class="glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-6">
                  <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Sub-25ns Route Engine</h3>
                <p class="text-sm text-slate-300 leading-relaxed">
                  Under the hood, requests are routed via Froot's monomorphic V8 engine. Tier 1 static exact map executes in under 25 nanoseconds.
                </p>
              </div>
              <div class="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-blue-300 bg-blue-500/10 border border-blue-500/25">&lt; 25ns Static</span>
                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-blue-300 bg-blue-500/10 border border-blue-500/25">124k req/sec</span>
              </div>
            </div>
          </div>
        </section>

        {/* BENCHMARK COMPARISON */}
        <section class="py-20 md:py-28 max-w-5xl mx-auto px-6" id="benchmarks">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              HEAD-TO-HEAD
            </span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-3 mb-4">
              Next.js 15 vs FrootKit
            </h2>
            <p class="text-slate-400 text-base">
              Comparing cold static site generation times and production runtime footprints.
            </p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse border border-slate-800 bg-[#070b13] rounded-xl overflow-hidden">
              <thead>
                <tr class="border-b border-slate-800 bg-white/[0.03] text-xs font-mono text-slate-400 uppercase tracking-wider">
                  <th class="p-4">Metric</th>
                  <th class="p-4">Next.js 15 (React 19)</th>
                  <th class="p-4 text-emerald-400 font-semibold">FrootKit (Preact)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-sm">
                <tr>
                  <td class="p-4 font-medium text-white">Cold SSG Build Time (20 Pages)</td>
                  <td class="p-4 text-slate-400">4,800 ms</td>
                  <td class="p-4 text-emerald-400 font-bold font-mono">890 ms (5.3x faster)</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-white">Default Client JS Bundle</td>
                  <td class="p-4 text-slate-400">86.4 KB (gzipped)</td>
                  <td class="p-4 text-emerald-400 font-bold font-mono">0 KB (Zero JS default)</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-white">SSR Framework Footprint</td>
                  <td class="p-4 text-slate-400">~85 KB</td>
                  <td class="p-4 text-emerald-400 font-bold font-mono">~3 KB (28x smaller)</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-white">Tailwind CSS Setup</td>
                  <td class="p-4 text-slate-400">postcss.config + tailwind.config</td>
                  <td class="p-4 text-emerald-400 font-bold font-mono">Native @theme in CSS</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-white">Configuration Files</td>
                  <td class="p-4 text-slate-400">next.config.ts, postcss.config.mjs</td>
                  <td class="p-4 text-emerald-400 font-bold font-mono">Zero config files</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CODE WINDOW */}
        <section class="py-20 md:py-28 max-w-6xl mx-auto px-6" id="code">
          <div class="text-center max-w-3xl mx-auto mb-16">
            <span class="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              CLEAN DEVELOPER EXPERIENCE
            </span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-3 mb-4">
              Write Clean App Code. Nothing Else.
            </h2>
            <p class="text-slate-400 text-base">
              Explore how layouts, dynamic pages, Tailwind tokens, and the CLI fit together.
            </p>
          </div>

          <div class="code-window">
            <div class="code-window-header flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span class="ml-3 text-xs font-mono text-slate-400">frootkit-app</span>
              </div>
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" id="code-tabs">
                <button
                  type="button"
                  class="tab-btn px-3 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white transition-colors active"
                  data-tab="layout"
                  {...{ onclick: "switchCodeTab('layout')" }}
                >
                  src/app/layout.tsx
                </button>
                <button
                  type="button"
                  class="tab-btn px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors"
                  data-tab="page"
                  {...{ onclick: "switchCodeTab('page')" }}
                >
                  docs/[slug]/page.tsx
                </button>
                <button
                  type="button"
                  class="tab-btn px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors"
                  data-tab="tailwind"
                  {...{ onclick: "switchCodeTab('tailwind')" }}
                >
                  src/styles.css
                </button>
                <button
                  type="button"
                  class="tab-btn px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-white transition-colors"
                  data-tab="cli"
                  {...{ onclick: "switchCodeTab('cli')" }}
                >
                  CLI Commands
                </button>
              </div>
            </div>

            <div class="p-6 overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-slate-200">
              <pre><code id="code-snippet-pre" class="language-typescript" dangerouslySetInnerHTML={{ __html: highlightCode(CODE_SNIPPETS['layout']!, 'typescript') }} /></pre>
            </div>
          </div>
        </section>

        {/* CTA BOTTOM */}
        <section class="py-20 max-w-4xl mx-auto px-6 text-center">
          <div class="glass-card rounded-3xl p-10 md:p-14 relative overflow-hidden border border-emerald-500/25">
            <h3 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to Build Without the Overhead?
            </h3>
            <p class="text-slate-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
              Scaffold your project with <code>npm create frootkit@latest</code> and experience true Next.js ergonomics with Preact speed.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/docs/quickstart" class="btn-primary-glow px-6 py-3 rounded-xl text-sm font-semibold">
                Get Started in 30 Seconds &rarr;
              </a>
              <a
                href="https://github.com/orbitnorth/froot"
                target="_blank"
                rel="noreferrer"
                class="px-6 py-3 rounded-xl text-sm font-semibold bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-white transition-all"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer class="border-t border-slate-800/80 bg-[#05080e] py-12 px-6">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">FrootKit</span>
            <span>&bull;</span>
            <span>Zero-overhead Next.js Alternative</span>
          </div>
          <div>
            Built with Froot SSG &bull; MIT License
          </div>
        </div>
      </footer>

      {/* Interactive Scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          const SNIPPETS = ${JSON.stringify(CODE_SNIPPETS)};

          function switchCodeTab(tabKey) {
            document.querySelectorAll('#code-tabs .tab-btn').forEach(btn => {
              if (btn.getAttribute('data-tab') === tabKey) {
                btn.classList.add('active', 'text-white');
                btn.classList.remove('text-slate-400');
              } else {
                btn.classList.remove('active', 'text-white');
                btn.classList.add('text-slate-400');
              }
            });
            const pre = document.getElementById('code-snippet-pre');
            if (pre && SNIPPETS[tabKey]) {
              pre.textContent = SNIPPETS[tabKey];
            }
          }

          function copyInstallCmd() {
            const cmd = document.getElementById('install-cmd-text')?.innerText || 'npm create frootkit@latest';
            navigator.clipboard.writeText(cmd).then(() => {
              const toast = document.getElementById('copy-toast');
              if (toast) {
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 2000);
              }
            });
          }
        `,
        }}
      />
    </div>
  );
}

