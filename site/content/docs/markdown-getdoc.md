---
title: Markdown & getDoc()
description: Build fast, documentation-driven content sites with getDoc() and automated TOC generation.
badge: Content
---

# Markdown & getDoc()

FrootKit includes a native Markdown documentation engine out of the box. Store your `.md` files in `content/docs/` and load them with `getDoc()`.

## Storing Content

Create markdown files in `content/docs/` with YAML frontmatter:

```markdown
---
title: My Guide
description: An introduction to advanced patterns.
badge: Advanced
---

# My Guide

Write standard GitHub Flavored Markdown here.
```

## Using `getDoc()` in Pages

In any page or dynamic slug route, call `getDoc(slug)`:

```tsx
import { getDoc } from 'frootkit';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDoc(slug);

  if (!doc) {
    return <div>Document not found.</div>;
  }

  return (
    <article class="prose prose-invert max-w-none">
      <span class="text-xs font-mono text-emerald-400">{doc.badge}</span>
      <h1>{doc.title}</h1>
      <p class="text-slate-300">{doc.description}</p>

      {/* Render Markdown Content */}
      <div dangerouslySetInnerHTML={{ __html: doc.contentHtml }} />
    </article>
  );
}
```

## Built-in Table of Contents

`getDoc()` parses headings (`h2`, `h3`) and returns a structured array for your sidebar or right-rail Table of Contents:

```tsx
{doc.toc.map((item) => (
  <a
    key={item.id}
    href={`#${item.id}`}
    class={item.depth === 3 ? 'pl-4 text-xs text-slate-400' : 'text-sm text-slate-200'}
  >
    {item.text}
  </a>
))}
```

