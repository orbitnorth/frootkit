---
title: Static Site Generation (SSG)
description: Generate ultra-fast static HTML pages with zero client JS overhead using frootkit build.
badge: Build
---

# Static Site Generation (SSG)

FrootKit is designed for high-performance Static Site Generation (SSG). During build time, the framework pre-renders every page into static HTML files.

## Running the Build

Run the build command:

```bash
frootkit build
```

This performs the following steps in under a second:
1. Compiles `src/styles.css` using Tailwind CSS v4.
2. Discovers all pages and layouts in `src/app/`.
3. Calls `generateStaticParams()` on dynamic routes to discover all slug paths.
4. Pre-renders each route with Preact SSR and writes pure HTML into `.froot/` (hidden build directory, exactly like `.next/` in Next.js).

## Output Structure

Similar to Next.js creating a `.next` folder, FrootKit outputs to `.froot`:

```
.froot/
├── index.html               -> /
├── styles.css               -> Compiled Tailwind CSS
└── docs/
    ├── index.html           -> /docs
    ├── overview/
    │   └── index.html       -> /docs/overview
    └── quickstart/
        └── index.html       -> /docs/quickstart
```

If you need to customize the output folder (e.g. for traditional hosts expecting `dist` or `out`), you can provide `-o` or `--out-dir`:

```bash
frootkit build -o dist
```

Every route is exported as a folder containing `index.html`, making it compatible with any standard static web server or CDN.

