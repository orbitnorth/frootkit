---
title: Nested Layouts
description: Understand how Root and Section layouts nest seamlessly in FrootKit.
badge: Layouts
---

# Nested Layouts

In FrootKit, nested layouts follow the Next.js layout model: layouts wrap around child layouts and pages in a hierarchical cascade without replacing the outer document shell.

## Root Layout (`src/app/layout.tsx`)

The root layout is the top-most layout required for every FrootKit application. It defines the `<html>` and `<body>` tags:

```tsx
import type { ComponentChildren } from 'preact';

export default function RootLayout({ children }: { children: ComponentChildren }) {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My FrootKit App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-[#030712] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

## Section Layout (`src/app/docs/layout.tsx`)

Section layouts wrap only the pages within their directory tree. Crucially, a section layout **does not** redeclare `<html>` or `<body>`—it renders only the structural container for that section:

```tsx
import type { ComponentChildren } from 'preact';

export default function DocsLayout({ children }: { children: ComponentChildren }) {
  return (
    <div class="flex min-h-screen">
      {/* Left-Rail Documentation Sidebar */}
      <aside class="w-64 border-r border-slate-800 p-6">
        <nav>
          <a href="/docs/overview" class="block py-1 text-slate-300 hover:text-white">Overview</a>
          <a href="/docs/quickstart" class="block py-1 text-slate-300 hover:text-white">Quickstart</a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main class="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

## Layout Hierarchy

When navigating to `/docs/quickstart`, the rendering pipeline embeds the components hierarchically:

```
RootLayout (src/app/layout.tsx)
 └── DocsLayout (src/app/docs/layout.tsx)
      └── DocsQuickstartPage (src/app/docs/[slug]/page.tsx)
```

The parent layout preserves its DOM structure and does not reload when switching between `/docs/overview` and `/docs/quickstart`.

