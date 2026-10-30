---
title: App Router
description: Learn how file-based routing works in FrootKit with Next.js conventions.
badge: Routing
---

# App Router

FrootKit adopts Next.js App Router conventions inside `src/app/`. Folders define URL paths, and special files control UI composition.

## Special Files

| File | Description |
| :--- | :--- |
| `layout.tsx` | Wraps page components and child layouts. Preserves state across route changes. |
| `page.tsx` | The unique UI rendered for a specific route path. |
| `route.ts` | Backend API route handler (GET, POST, PUT, DELETE). |
| `not-found.tsx` | Fallback UI for 404 errors. |

## Routing Examples

```
src/app/
├── layout.tsx         -> Root document layout
├── page.tsx           -> /
├── about/
│   └── page.tsx       -> /about
├── blog/
│   ├── page.tsx       -> /blog
│   └── [slug]/
│       └── page.tsx   -> /blog/:slug (Dynamic route)
└── docs/
    ├── layout.tsx     -> Wraps all /docs/* pages
    ├── page.tsx       -> /docs
    └── [slug]/
        └── page.tsx   -> /docs/:slug
```

## Dynamic Segments

To capture dynamic parameters, wrap the folder name in square brackets: `[slug]`.

Inside `page.tsx`, access parameters via the `params` prop:

```tsx
interface PageProps {
  params: {
    slug: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <h1>Article: {slug}</h1>;
}
```

For Static Site Generation (SSG), export `generateStaticParams()`:

```tsx
export async function generateStaticParams() {
  return [
    { slug: 'overview' },
    { slug: 'quickstart' },
    { slug: 'architecture' },
  ];
}
```

