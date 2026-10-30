/**
 * Comprehensive Test Suite for @froot/fullstack (Next.js Alternative)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { h } from 'preact';
import { Froot } from 'frootjs';
import {
  createAppRouter,
  renderPreact,
  isPreactElement,
  isHtmlDocument,
  renderMarkdown,
  parseFrontmatter,
  renderMarkdownFile,
  extractHeadings,
  getDoc,
  renderDoc,
} from '../dist/index.js';

describe('🚀 @froot/fullstack (Next.js Alternative for Froot & Preact)', () => {
  it('should detect Preact VNodes with isPreactElement', () => {
    const el = h('div', { class: 'hero' }, 'Hello');
    assert.equal(isPreactElement(el), true);
    assert.equal(isPreactElement('<div>not a vnode</div>'), false);
    assert.equal(isPreactElement(null), false);
  });

  it('should render Preact component tree and add <!DOCTYPE html> for <html>', () => {
    const Page = () =>
      h('html', { lang: 'en' },
        h('head', null, h('title', null, 'Fullstack App')),
        h('body', null, h('h1', null, 'Welcome to Fullstack Froot'))
      );

    const html = renderPreact(h(Page, null));
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<html lang="en">'));
    assert.ok(html.includes('<h1>Welcome to Fullstack Froot</h1>'));
  });

  it('should support Next.js-style nested layouts and dynamic routes', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Docs Layout (Next.js layout pattern)
    router.layout('/docs', ({ children, currentPath }) => {
      return h('div', { id: 'fullstack-layout', 'data-path': currentPath },
        h('aside', { id: 'docs-sidebar' }, 'Left Sidebar Navigation'),
        h('main', { id: 'docs-content' }, children)
      );
    });

    // Dynamic Docs Page (Next.js [slug] pattern)
    router.page('/docs/:slug?', ({ params }) => {
      const slug = params['slug'] || 'overview';
      return h('article', { class: 'article' },
        h('h1', null, `Document: ${slug}`),
        h('p', null, `This is content for ${slug}`)
      );
    });

    // Landing Page
    router.page('/', () => {
      return h('div', { id: 'landing-hero' }, h('h1', null, 'Landing Page'));
    });

    // 1. Fetch Landing Page
    const resHome = await app.fetch(new Request('http://localhost/'));
    assert.equal(resHome.status, 200);
    const htmlHome = await resHome.text();
    assert.ok(htmlHome.includes('id="landing-hero"'));
    assert.ok(!htmlHome.includes('id="fullstack-layout"'), 'Landing must NOT have docs layout');

    // 2. Fetch /docs (base overview)
    const resDocs = await app.fetch(new Request('http://localhost/docs'));
    assert.equal(resDocs.status, 200);
    const htmlDocs = await resDocs.text();
    assert.ok(htmlDocs.includes('id="fullstack-layout"'));
    assert.ok(htmlDocs.includes('id="docs-sidebar"'));
    assert.ok(htmlDocs.includes('<h1>Document: overview</h1>'));

    // 3. Fetch /docs/quickstart (parametric route)
    const resQuick = await app.fetch(new Request('http://localhost/docs/quickstart'));
    assert.equal(resQuick.status, 200);
    const htmlQuick = await resQuick.text();
    assert.ok(htmlQuick.includes('id="fullstack-layout"'));
    assert.ok(htmlQuick.includes('<h1>Document: quickstart</h1>'));
  });

  it('should parse markdown and frontmatter metadata', () => {
    const raw = `---
title: Getting Started
category: Core
slug: /docs/start
---
# Welcome
This is the **markdown** content.`;

    const { frontmatter, content } = parseFrontmatter(raw);
    assert.equal(frontmatter.title, 'Getting Started');
    assert.equal(frontmatter.category, 'Core');
    assert.equal(frontmatter.slug, '/docs/start');

    const html = renderMarkdown(content);
    assert.ok(html.includes('<h1 id="welcome">Welcome</h1>'));
    assert.ok(html.includes('<strong>markdown</strong>'));
  });

  it('should export static pages using exportStatic and generateStaticParams', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-fullstack-ssg-'));
    const app = new Froot();
    const router = createAppRouter(app);

    router.page('/', () => h('h1', null, 'Home Page'));
    router.page(
      '/docs/:slug',
      ({ params }) => h('div', null, h('h1', null, `Doc: ${params['slug']}`)),
      {
        generateStaticParams: () => [{ slug: 'intro' }, { slug: 'install' }],
      }
    );

    const result = await router.exportStatic({ outDir: tmpDir });
    assert.equal(result.renderedRoutes.length, 3);
    assert.ok(result.renderedRoutes.includes('/'));
    assert.ok(result.renderedRoutes.includes('/docs/intro'));
    assert.ok(result.renderedRoutes.includes('/docs/install'));

    const homeHtml = await fs.readFile(path.join(tmpDir, 'index.html'), 'utf8');
    assert.ok(homeHtml.includes('<h1>Home Page</h1>'));

    const introHtml = await fs.readFile(path.join(tmpDir, 'docs/intro/index.html'), 'utf8');
    assert.ok(introHtml.includes('<h1>Doc: intro</h1>'));

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should extract headings matching rendered HTML tags', () => {
    const raw = `
# Getting Started with Froot
Welcome!

## Installation Guide
Run the install command.

\`\`\`bash
# this is a comment inside code block, not a heading
npm install froot-fullstack
\`\`\`

### System Requirements
Requires Node.js 22+.

## Fast \`Froot\` Performance
Lightning fast.
`;
    const headings = extractHeadings(raw);
    assert.equal(headings.length, 4);
    assert.deepEqual(headings[0], { id: 'getting-started-with-froot', text: 'Getting Started with Froot', level: 1 });
    assert.deepEqual(headings[1], { id: 'installation-guide', text: 'Installation Guide', level: 2 });
    assert.deepEqual(headings[2], { id: 'system-requirements', text: 'System Requirements', level: 3 });
    assert.deepEqual(headings[3], { id: 'fast-froot-performance', text: 'Fast Froot Performance', level: 2 });

    const html = renderMarkdown(raw);
    assert.ok(html.includes('<h1 id="getting-started-with-froot">'));
    assert.ok(html.includes('<h2 id="installation-guide">'));
    assert.ok(html.includes('<h3 id="system-requirements">'));
    assert.ok(html.includes('<h2 id="fast-froot-performance">'));
  });

  it('should load markdown docs with getDoc and renderDoc including headings', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-doc-test-'));
    const contentDocsDir = path.join(tmpDir, 'content', 'docs');
    await fs.mkdir(contentDocsDir, { recursive: true });

    await fs.writeFile(
      path.join(contentDocsDir, 'overview.md'),
      `---
title: Fullstack Overview
category: Documentation
---
# Overview
This is the overview document.

## Features
- Fast SSR
- Zero configuration
`,
      'utf8'
    );

    // 1. Using getDoc with explicit contentDir
    const doc1 = await getDoc('overview', { contentDir: contentDocsDir });
    assert.equal(doc1.frontmatter['title'], 'Fullstack Overview');
    assert.equal(doc1.frontmatter['category'], 'Documentation');
    assert.ok(doc1.html.includes('<h1 id="overview">Overview</h1>'));
    assert.ok(doc1.html.includes('<h2 id="features">Features</h2>'));
    assert.ok(Array.isArray(doc1.headings));
    assert.equal(doc1.headings?.length, 2);
    assert.deepEqual(doc1.headings?.[0], { id: 'overview', text: 'Overview', level: 1 });
    assert.deepEqual(doc1.headings?.[1], { id: 'features', text: 'Features', level: 2 });

    // 2. Using renderDoc with string contentDir
    const doc2 = await renderDoc('overview', contentDocsDir);
    assert.equal(doc2.frontmatter['title'], 'Fullstack Overview');

    // 3. Using getDoc with allowNotFound: true
    const notFoundDoc = await getDoc('nonexistent-slug', { contentDir: contentDocsDir, allowNotFound: true });
    assert.equal(notFoundDoc, null);

    // 4. Missing doc throws Error with searched locations when allowNotFound is not set
    await assert.rejects(
      async () => {
        await getDoc('nonexistent-slug', { contentDir: contentDocsDir });
      },
      /Markdown document not found for slug "nonexistent-slug"/
    );

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should cleanly compose RootLayout (document shell) and DocsLayout (inner UI) without duplicating html', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout renders outer document shell (<html>, <head>, <body>)
    router.layout('/', ({ children }) => {
      return h('html', { lang: 'en' },
        h('head', null, h('title', null, 'My Froot Site')),
        h('body', { class: 'bg-slate-950 text-white' },
          h('div', { id: 'root-container' }, children)
        )
      );
    });

    // Docs layout only renders inner UI container (sidebar + main) - NO <html> or <body> needed!
    router.layout('/docs', ({ children, currentPath }) => {
      return h('div', { class: 'docs-layout', 'data-path': currentPath },
        h('aside', { class: 'docs-sidebar' }, 'Docs Sidebar Navigation'),
        h('main', { class: 'docs-main' }, children)
      );
    });

    // Page renders just the page content
    router.page('/docs/getting-started', () => {
      return h('div', { class: 'doc-content' },
        h('h1', null, 'Getting Started'),
        h('p', null, 'Hello World')
      );
    });

    const res = await app.fetch(new Request('http://localhost/docs/getting-started'));
    assert.equal(res.status, 200);
    const html = await res.text();

    // Verify outer document structure
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<html lang="en">'));
    assert.ok(html.includes('<title>My Froot Site</title>'));
    assert.ok(html.includes('<body class="bg-slate-950 text-white">'));

    // Verify inner UI layout is nested inside root
    assert.ok(html.includes('<div id="root-container"><div class="docs-layout"'));
    assert.ok(html.includes('<aside class="docs-sidebar">Docs Sidebar Navigation</aside>'));
    assert.ok(html.includes('<main class="docs-main"><div class="doc-content"><h1>Getting Started</h1><p>Hello World</p></div></main>'));

    // Crucial check: exactly ONE <html> tag and ONE <body> tag!
    const htmlTagsCount = (html.match(/<html/gi) || []).length;
    const bodyTagsCount = (html.match(/<body/gi) || []).length;
    assert.equal(htmlTagsCount, 1, 'Should contain exactly one <html tag');
    assert.equal(bodyTagsCount, 1, 'Should contain exactly one <body tag');
  });

  it('should prevent nested <html> tags when inner layout renders a root document or isHtmlDocument', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout
    router.layout('/', ({ children }) => {
      return h('html', { id: 'root-html' },
        h('body', null, children)
      );
    });

    // Inner layout returns its own full HTML document
    router.layout('/standalone-html', ({ children }) => {
      return h('html', { id: 'custom-inner-html' },
        h('body', { class: 'standalone-body' }, children)
      );
    });

    router.page('/standalone-html/demo', () => {
      return h('p', null, 'Standalone content');
    });

    const res = await app.fetch(new Request('http://localhost/standalone-html/demo'));
    assert.equal(res.status, 200);
    const html = await res.text();

    assert.ok(html.includes('id="custom-inner-html"'));
    assert.ok(!html.includes('id="root-html"'), 'Root HTML wrapper must be skipped when inner layout already rendered full html');
    const htmlCount = (html.match(/<html/gi) || []).length;
    assert.equal(htmlCount, 1, 'Must not have nested <html><html> tags');
  });

  it('should support route groups for layout scoping', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout
    router.layout('/', ({ children }) => {
      return h('div', { id: 'global-root' }, children);
    });

    // Marketing layout scoped to (marketing)
    router.layout('/', ({ children }) => {
      return h('div', { id: 'marketing-wrapper' }, children);
    }, { group: '(marketing)' });

    // Docs layout scoped to (docs)
    router.layout('/docs', ({ children }) => {
      return h('div', { id: 'docs-wrapper' }, children);
    }, { group: '(docs)' });

    router.page('/about', () => h('h1', null, 'About Us'), { group: '(marketing)' });
    router.page('/docs/api', () => h('h1', null, 'API Reference'), { group: '(docs)' });

    // Request marketing route
    const resMkt = await app.fetch(new Request('http://localhost/about'));
    const htmlMkt = await resMkt.text();
    assert.ok(htmlMkt.includes('id="global-root"'));
    assert.ok(htmlMkt.includes('id="marketing-wrapper"'));
    assert.ok(!htmlMkt.includes('id="docs-wrapper"'), 'Marketing route must NOT have docs layout');

    // Request docs route
    const resDocs = await app.fetch(new Request('http://localhost/docs/api'));
    const htmlDocs = await resDocs.text();
    assert.ok(htmlDocs.includes('id="global-root"'));
    assert.ok(htmlDocs.includes('id="docs-wrapper"'));
    assert.ok(!htmlDocs.includes('id="marketing-wrapper"'), 'Docs route must NOT have marketing layout');
  });
});

