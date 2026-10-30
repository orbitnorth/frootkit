---
title: Deployment Guide
description: Deploy your FrootKit site to Cloudflare Pages, Netlify, Vercel, or run with Node.js.
badge: Operations
---

# Deployment Guide

Because FrootKit outputs clean static HTML and CSS to `.froot/` (or `dist/` with `-o dist`), it can be hosted on any static cloud provider or run with a Node.js server.

## 1. Cloudflare Pages

1. Link your Git repository in the Cloudflare Dashboard.
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `.froot`
3. Click **Save and Deploy**.

## 2. Netlify

Create a `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".froot"
```

Push to your repository or run `npx netlify deploy --prod --dir=.froot`.

## 3. Vercel

In your Vercel project settings:
- **Framework Preset:** Other
- **Build Command:** `npm run build`
- **Output Directory:** `.froot`

## 4. Production Node.js Server

To run your application using Froot's hyper-performance HTTP server:

```bash
frootkit start --port 3000
```

