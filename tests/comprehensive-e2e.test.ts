import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { h } from 'preact';
import { Froot } from 'frootjs';
import {
  createFrootKit,
  createFullstackApp,
  createAppRouter,
  build,
  getDoc,
  renderMarkdown,
  parseFrontmatter,
  extractHeadings,
  highlightCode,
} from '../dist/index.js';
import { scaffoldProject } from '../../create-frootkit/dist/index.js';

describe('🧪 FrootKit Comprehensive Verification & Checks', () => {
  it('should scaffold a complete project and build into .froot by default', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-e2e-app-'));
    try {
      // 1. Scaffold project
      const scaffoldRes = await scaffoldProject({
        targetDir: tmpDir,
        projectName: 'e2e-test-app',
        pkgManager: 'npm',
        gitInit: false,
      });

      assert.ok(scaffoldRes.fileCount > 0, 'Must create template files');
      assert.ok(fsSync.existsSync(path.join(tmpDir, 'package.json')), 'package.json must exist');
      assert.ok(fsSync.existsSync(path.join(tmpDir, 'src/app/layout.tsx')), 'src/app/layout.tsx must exist');
      assert.ok(fsSync.existsSync(path.join(tmpDir, 'src/app/page.tsx')), 'src/app/page.tsx must exist');
      assert.ok(fsSync.existsSync(path.join(tmpDir, 'src/app/docs/layout.tsx')), 'src/app/docs/layout.tsx must exist');
      assert.ok(fsSync.existsSync(path.join(tmpDir, 'src/styles.css')), 'src/styles.css must exist');

      // Verify zero wrapper files
      assert.ok(!fsSync.existsSync(path.join(tmpDir, 'server.tsx')), 'server.tsx must NOT exist');
      assert.ok(!fsSync.existsSync(path.join(tmpDir, 'app.tsx')), 'app.tsx must NOT exist');
      assert.ok(!fsSync.existsSync(path.join(tmpDir, 'build.ts')), 'build.ts must NOT exist');
      assert.ok(!fsSync.existsSync(path.join(tmpDir, 'app.js')), 'app.js must NOT exist');

      // 2. Run build on the scaffolded project
      const buildRes = await build({
        cwd: tmpDir,
        tailwind: false, // bypass external CLI in fast unit test
      });

      // 3. Verify output directory is .froot (hidden directory like .next)
      assert.ok(buildRes.outDir.endsWith('.froot'), `outDir must end with .froot, got ${buildRes.outDir}`);
      assert.ok(fsSync.existsSync(path.join(tmpDir, '.froot')), '.froot folder must exist');
      assert.ok(!fsSync.existsSync(path.join(tmpDir, 'dist')), 'dist folder must NOT exist');

      // 4. Verify pre-rendered HTML files
      const homeHtmlPath = path.join(tmpDir, '.froot/index.html');
      assert.ok(fsSync.existsSync(homeHtmlPath), '.froot/index.html must exist');
      const homeHtml = await fs.readFile(homeHtmlPath, 'utf8');

      // Check single HTML document shell
      assert.ok(homeHtml.startsWith('<!DOCTYPE html>'), 'Must start with <!DOCTYPE html>');
      const htmlCount = (homeHtml.match(/<html/gi) || []).length;
      const bodyCount = (homeHtml.match(/<body/gi) || []).length;
      assert.equal(htmlCount, 1, 'Must contain exactly 1 <html> tag');
      assert.equal(bodyCount, 1, 'Must contain exactly 1 <body> tag');
      assert.ok(homeHtml.includes('e2e-test-app') || homeHtml.includes('Froot'), 'Must contain app title');

      // 5. Verify docs route
      const docsHtmlPath = path.join(tmpDir, '.froot/docs/index.html');
      assert.ok(fsSync.existsSync(docsHtmlPath), '.froot/docs/index.html must exist');
      const docsHtml = await fs.readFile(docsHtmlPath, 'utf8');
      assert.ok(docsHtml.startsWith('<!DOCTYPE html>'));
      assert.equal((docsHtml.match(/<html/gi) || []).length, 1);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should support custom outDir when specified via options', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-custom-out-'));
    try {
      const app = new Froot();
      const router = createAppRouter(app);

      router.layout('/', ({ children }) => {
        return h('html', null, h('body', null, children));
      });
      router.page('/', () => h('h1', null, 'Custom Output Page'));

      const customOut = path.join(tmpDir, 'my-custom-dist');
      const res = await router.exportStatic({ outDir: customOut });

      assert.equal(res.outDir, customOut);
      assert.ok(fsSync.existsSync(path.join(customOut, 'index.html')));
      const html = await fs.readFile(path.join(customOut, 'index.html'), 'utf8');
      assert.ok(html.includes('Custom Output Page'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should compose multi-tier nested layouts (Root -> Section -> SubSection -> Page)', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Level 1: Document Root Layout
    router.layout('/', ({ children }) => {
      return h('html', { lang: 'en' },
        h('head', null, h('title', null, 'Multi-Tier Site')),
        h('body', { class: 'root-body' },
          h('div', { id: 'l1-root' }, children)
        )
      );
    });

    // Level 2: Dashboard Section Layout
    router.layout('/dashboard', ({ children }) => {
      return h('section', { id: 'l2-dashboard' },
        h('aside', { id: 'dashboard-sidebar' }, 'Dashboard Nav'),
        h('div', { id: 'dashboard-content' }, children)
      );
    });

    // Level 3: Settings Subsection Layout
    router.layout('/dashboard/settings', ({ children }) => {
      return h('div', { id: 'l3-settings-tabs' },
        h('nav', { id: 'settings-nav' }, 'Settings Tabs'),
        h('div', { id: 'settings-body' }, children)
      );
    });

    // Level 4: Leaf Page
    router.page('/dashboard/settings/profile', () => {
      return h('form', { id: 'profile-form' },
        h('h2', null, 'Profile Settings')
      );
    });

    const res = await app.fetch(new Request('http://localhost/dashboard/settings/profile'));
    assert.equal(res.status, 200);
    const html = await res.text();

    // Verify outer document
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.equal((html.match(/<html/gi) || []).length, 1);
    assert.equal((html.match(/<body/gi) || []).length, 1);

    // Verify strict hierarchical nesting order
    assert.ok(html.includes('<div id="l1-root"><section id="l2-dashboard">'));
    assert.ok(html.includes('<div id="dashboard-content"><div id="l3-settings-tabs">'));
    assert.ok(html.includes('<div id="settings-body"><form id="profile-form"><h2>Profile Settings</h2></form></div>'));
  });

  it('should support dynamic multi-parameter routes and generateStaticParams', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.layout('/', ({ children }) => h('html', null, h('body', null, children)));

    router.page(
      '/shop/:category/:product',
      ({ params }) => {
        return h('div', { class: 'product-view' },
          h('span', { class: 'cat' }, params['category']),
          h('span', { class: 'prod' }, params['product'])
        );
      },
      {
        generateStaticParams: async () => [
          { category: 'gear', product: 'boots' },
          { category: 'gear', product: 'gloves' },
          { category: 'tech', product: 'laptop' },
        ],
      }
    );

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-multi-param-'));
    try {
      const res = await router.exportStatic({ outDir: tmpDir });
      assert.equal(res.renderedRoutes.length, 3);
      assert.ok(res.renderedRoutes.includes('/shop/gear/boots'));
      assert.ok(res.renderedRoutes.includes('/shop/gear/gloves'));
      assert.ok(res.renderedRoutes.includes('/shop/tech/laptop'));

      const bootsHtml = await fs.readFile(path.join(tmpDir, 'shop/gear/boots/index.html'), 'utf8');
      assert.ok(bootsHtml.includes('<span class="cat">gear</span>'));
      assert.ok(bootsHtml.includes('<span class="prod">boots</span>'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle markdown parsing, deep headings, and syntax highlighting', () => {
    const markdownSource = `---
title: Advanced Framework Internals
category: Engineering
featured: true
tags:
  - performance
  - preact
---

# Advanced Framework Internals

An overview of internal optimizations.

## Monomorphic V8 Inline Caches

Context instances have fixed property shapes.

\`\`\`typescript
import { Froot } from 'frootjs';
const app = new Froot();
app.get('/test', (c) => c.text('ok'));
\`\`\`

### Deep Subheading

Here is detail on deoptimization prevention.

\`\`\`json
{
  "throughput": 124000,
  "deopts": 0
}
\`\`\`
`;

    const { frontmatter, content } = parseFrontmatter(markdownSource);
    assert.equal(frontmatter['title'], 'Advanced Framework Internals');
    assert.equal(frontmatter['category'], 'Engineering');
    assert.equal(frontmatter['featured'], 'true');

    const html = renderMarkdown(content);
    const headings = extractHeadings(content);

    // Verify HTML rendering and code highlighting
    assert.ok(html.includes('id="monomorphic-v8-inline-caches"'));
    assert.ok(html.includes('id="deep-subheading"'));
    assert.ok(html.includes('class="token-keyword"'));
    assert.ok(html.includes('class="token-string"'));

    // Verify headings extraction (TOC)
    const h2 = headings.find((h) => h.id === 'monomorphic-v8-inline-caches');
    assert.ok(h2, 'Must extract h2 heading');
    assert.equal(h2.level, 2);

    const h3 = headings.find((h) => h.id === 'deep-subheading');
    assert.ok(h3, 'Must extract h3 heading');
    assert.equal(h3.level, 3);
  });

  it('should highlight code across multiple languages with highlightCode()', () => {
    // TypeScript
    const tsHtml = highlightCode(`const x: number = 42;`, 'typescript');
    assert.ok(tsHtml.includes('token-keyword'));

    // JSON
    const jsonHtml = highlightCode(`{ "name": "froot" }`, 'json');
    assert.ok(jsonHtml.includes('token-string') || jsonHtml.includes('token-property'));

    // Bash
    const bashHtml = highlightCode(`npm run build`, 'bash');
    assert.ok(bashHtml.length > 0);
  });

  it('should verify createFrootKit initializes an app instance cleanly', async () => {
    const { app, router } = await createFrootKit({
      autoListen: false,
      tailwind: false,
    });
    assert.ok(app, 'Must return app instance');
    assert.ok(router, 'Must return router instance');
  });

  it('should handle missing getDoc gracefully with descriptive error', async () => {
    await assert.rejects(
      async () => {
        await getDoc('non-existent-slug-xyz-12345');
      },
      (err: Error) => {
        assert.ok(err.message.includes('Markdown document not found'));
        return true;
      }
    );
  });
});
