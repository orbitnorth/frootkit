export interface DocItem {
  id: string;
  title: string;
  badge?: string;
  summary: string;
  slug: string;
}

export interface DocCategory {
  category: string;
  items: DocItem[];
}

export const FROOTKIT_DOCS_NAV: DocCategory[] = [
  {
    category: 'Getting Started',
    items: [
      {
        id: 'overview',
        title: 'Introduction',
        badge: 'Overview',
        summary: 'Overview of FrootKit: Preact SSR, App Router, and Tailwind v4.',
        slug: '/docs',
      },
      {
        id: 'quickstart',
        title: 'Quickstart',
        badge: 'Start Here',
        summary: 'Create and launch your first FrootKit app in under 30 seconds.',
        slug: '/docs/quickstart',
      },
    ],
  },
  {
    category: 'Architecture',
    items: [
      {
        id: 'app-router',
        title: 'App Router',
        badge: 'Core',
        summary: 'File-based routing conventions, layout.tsx, page.tsx, and params.',
        slug: '/docs/app-router',
      },
      {
        id: 'nested-layouts',
        title: 'Nested Layouts',
        badge: 'Layouts',
        summary: 'Hierarchical composition of root document shells and nested section layouts.',
        slug: '/docs/nested-layouts',
      },
      {
        id: 'tailwind-v4',
        title: 'Tailwind CSS v4 Native',
        badge: 'CSS-First',
        summary: 'Native Tailwind v4 compilation with @theme and zero configuration files.',
        slug: '/docs/tailwind-v4',
      },
    ],
  },
  {
    category: 'Features & Operations',
    items: [
      {
        id: 'markdown-getdoc',
        title: 'Markdown & getDoc()',
        badge: 'Content',
        summary: 'Native Markdown documentation engine with automated TOC extraction.',
        slug: '/docs/markdown-getdoc',
      },
      {
        id: 'ssg-export',
        title: 'Static Site Generation',
        badge: 'SSG',
        summary: 'Pre-render fast HTML pages with generateStaticParams() and frootkit build.',
        slug: '/docs/ssg-export',
      },
      {
        id: 'deployment',
        title: 'Deployment Guide',
        badge: 'Deploy',
        summary: 'Deploy static exports to Cloudflare Pages, Netlify, Vercel, or Node.js.',
        slug: '/docs/deployment',
      },
    ],
  },
];

export const FULLSTACK_DOCS_NAV = FROOTKIT_DOCS_NAV;
export const ALL_DOC_ITEMS: DocItem[] = FROOTKIT_DOCS_NAV.flatMap((c) => c.items);

export function getAdjacentDocs(currentId: string): { prev?: DocItem; next?: DocItem } {
  const index = ALL_DOC_ITEMS.findIndex((item) => item.id === currentId);
  if (index === -1) return {};
  return {
    prev: index > 0 ? ALL_DOC_ITEMS[index - 1] : undefined,
    next: index < ALL_DOC_ITEMS.length - 1 ? ALL_DOC_ITEMS[index + 1] : undefined,
  };
}

