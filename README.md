# FrootKit

> High-performance Next.js alternative for [Froot](https://github.com/orbitnorth/froot) and [Preact](https://preactjs.com).
> Next.js App Router conventions with Preact SSR speed and native Tailwind CSS v4. Zero wrapper boilerplate and zero mandatory client JS.

[![npm version](https://img.shields.io/npm/v/frootkit.svg)](https://www.npmjs.com/package/frootkit)
[![license](https://img.shields.io/npm/l/frootkit.svg)](https://github.com/orbitnorth/frootkit/blob/main/LICENSE)

---

## ⚡ Highlights

- **Next.js App Router Parity**: Familiar `src/app/layout.tsx`, `page.tsx`, nested section layouts, and dynamic segments `[slug]`.
- **~3 KB Preact SSR**: Swap out bulky 85KB React runtime bundles for Preact’s razor-thin 3KB footprint with zero hydration churn.
- **Native Tailwind CSS v4**: Real CSS-first styling with `@theme` and `@tailwindcss/cli`. Zero `postcss.config.js` or `tailwind.config.js`.
- **Markdown & `getDoc()`**: Built-in documentation loader. Parses frontmatter, generates Table of Contents, and highlights code blocks automatically.
- **Zero-Wrapper CLI**: No `server.tsx`, `build.ts`, or `app.tsx` needed in your project root. Run directly with `frootkit dev`, `build`, and `start`.
- **Hidden `.froot/` Build Artifacts**: Outputs production builds directly to `.froot/` just like Next.js creates `.next/`.
- **Sub-25ns Router**: Powered by Froot's monomorphic V8 inline cache architecture delivering 124,000+ req/sec.

---

## 🚀 Quickstart

Create a new FrootKit app in seconds:

```bash
# Using npm
npm create frootkit@latest my-app

# Using pnpm
pnpm create frootkit my-app

# Using bun
bun create frootkit my-app
```

Then start the development server:

```bash
cd my-app
npm run dev
```

Visit `http://localhost:3000` to see your live site with instant hot reloading.

---

## 🛠️ CLI Commands

| Command | Description |
| :--- | :--- |
| `frootkit dev` | Start development server with Tailwind watcher and hot-reloading |
| `frootkit build` | Pre-render static pages into `.froot/` (or `-o <dir>`) |
| `frootkit start` | Launch hyper-performance production server |
| `frootkit create <dir>` | Scaffold a new FrootKit project |

---

## 📁 Project Structure

```
my-app/
├── package.json
├── tsconfig.json
├── content/
│   └── docs/
│       ├── overview.md
│       └── quickstart.md
└── src/
    ├── styles.css             # Tailwind v4 @theme tokens
    └── app/
        ├── layout.tsx         # Document Root Layout (HTML shell)
        ├── page.tsx           # Home page (/)
        └── docs/
            ├── layout.tsx     # Section Layout (Docs Sidebar)
            ├── page.tsx       # /docs landing
            └── [slug]/
                └── page.tsx   # Dynamic SSG page (/docs/:slug)
```

---

## 📄 License

MIT © [OrbitNorth LLC](https://github.com/orbitnorth)
