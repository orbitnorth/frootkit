---
title: Quickstart Guide
description: Scaffold and launch your first FrootKit application in under 30 seconds.
badge: Getting Started
---

# Quickstart Guide

Get up and running with FrootKit in seconds using the official dedicated CLI.

## 1. Create a New Project

Run `create-frootkit` using your preferred package manager:

```bash
# Using npm
npm create frootkit@latest my-app

# Using pnpm
pnpm create frootkit my-app

# Using bun
bun create frootkit my-app
```

The interactive wizard will prompt you for your project name and initialize a clean Next.js-style project structure.

## 2. Project Structure

A freshly scaffolded FrootKit project contains only application code:

```
my-app/
├── package.json
├── tsconfig.json
├── content/
│   └── docs/
│       ├── overview.md
│       └── quickstart.md
└── src/
    ├── styles.css
    └── app/
        ├── layout.tsx         # Document Root Layout (HTML shell)
        ├── page.tsx           # Home page (/)
        └── docs/
            ├── layout.tsx     # Section Layout (Docs Sidebar)
            ├── page.tsx       # /docs landing
            └── [slug]/
                └── page.tsx   # Dynamic SSG page (/docs/:slug)
```

> **Note:** There are no wrapper scripts (`server.tsx`, `app.tsx`, `build.ts`, or `app.js`). All runtime orchestration is handled directly by `frootkit`.

## 3. Development Server

Start the local development server with hot module reloading and Tailwind CSS compilation:

```bash
cd my-app
npm run dev
```

Visit `http://localhost:3000` in your browser. Any changes to `src/app/**/*.tsx` or `src/styles.css` will instantly update.

## 4. Building for Production

Compile your application into static HTML and optimized CSS:

```bash
npm run build
```

Your production assets will be output to the `.froot/` directory (hidden build directory, just like `.next` in Next.js), ready to deploy to any static host or run with:

```bash
npm run start
```

