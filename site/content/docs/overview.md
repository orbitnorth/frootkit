---
title: Introduction to FrootKit
description: A lightweight, hyper-fast Next.js alternative built on Preact SSR, Tailwind CSS v4, and the Froot monomorphic engine.
badge: Core Concept
---

# Introduction to FrootKit

**FrootKit** is a modern, zero-wrapper fullstack web framework designed as a high-performance alternative to Next.js. It pairs the familiar file-based App Router ergonomics of Next.js with the raw speed and tiny footprint of Preact SSR and the Froot monomorphic V8 engine.

```
+-----------------------------------------------------------+
|                       FrootKit App                        |
|  - Next.js App Router (src/app/layout.tsx, page.tsx)     |
|  - Hierarchical Nested Layouts (Shell -> Section -> Page) |
|  - Preact SSR (3KB runtime vs 80KB React)                 |
|  - Native Tailwind CSS v4 (@theme & zero-config CLI)      |
|  - Markdown Documentation Engine (getDoc, TOC, syntax)    |
|  - Zero-Wrapper CLI (frootkit dev / build / start)        |
+-----------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                     Frootjs Core Engine                   |
|  - Monomorphic Inline Cache Architecture (< 25ns lookup)  |
|  - Zero heap churn & 124,000+ req/sec throughput          |
+-----------------------------------------------------------+
```

## Why FrootKit?

Modern React meta-frameworks have grown increasingly heavy, with complex bundling pipelines, megabytes of client-side JavaScript hydration, and slow development servers.

FrootKit strips away that complexity:

| Feature | Next.js 15 | FrootKit |
| :--- | :--- | :--- |
| **Runtime Size** | ~85 KB (React + DOM + runtime) | **~3 KB** (Preact SSR) |
| **Client JS Hydration** | Required unless using Server Components | **Zero by default** (SSG/SSR HTML) |
| **Cold Build Time** | 4 - 12 seconds | **< 1 second** |
| **Routing Lookup** | Regex / Radix tree | **Monomorphic Hash Map (< 25ns)** |
| **Tailwind Support** | PostCSS config required | **Native Tailwind v4 Built-in** |
| **Boilerplate Files** | `next.config.ts`, `postcss.config.mjs` | **Zero config files** |

## Core Highlights

### 1. Next.js App Router Conventions
Build using standard `src/app/layout.tsx`, `src/app/page.tsx`, and dynamic segments like `src/app/docs/[slug]/page.tsx`. Nested layouts seamlessly wrap their sub-pages without overwriting parent shells.

### 2. Zero-Wrapper Architecture
No `server.tsx`, no `app.tsx`, no `build.ts`, and no `app.js` in your project root. Run directly with the `frootkit` CLI:
```bash
frootkit dev    # Hot-reloading dev server
frootkit build  # Full SSG static export
frootkit start  # High-performance production server
```

### 3. Native Tailwind CSS v4
Tailwind CSS v4 is compiled natively with `@tailwindcss/cli`. No `tailwind.config.js` or PostCSS files are required. Simply declare design tokens directly in `src/styles.css` with `@theme`.

### 4. Built-in Markdown Engine
Documentation and blog sites require no extra plugins. Use `getDoc(slug)` to automatically parse frontmatter, extract headings for a Table of Contents, and render syntax-highlighted code blocks.

