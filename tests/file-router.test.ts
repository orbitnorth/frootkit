import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { Froot } from 'frootjs';
import {
  createAppRouter,
  formatRouteSegment,
  parseRoutePattern,
  extractRouteGroup,
} from '../dist/index.js';

describe('📁 File-Based Router & Layout Nesting', () => {
  it('should format Next.js bracket segments to Froot route patterns', () => {
    assert.equal(formatRouteSegment('[slug]'), ':slug');
    assert.equal(formatRouteSegment('[id]'), ':id');
    assert.equal(formatRouteSegment('[...catchAll]'), '*');
    assert.equal(formatRouteSegment('[[...optional]]'), ':optional?');
    assert.equal(formatRouteSegment('(marketing)'), '');
    assert.equal(formatRouteSegment('(auth)'), '');
    assert.equal(formatRouteSegment('about'), 'about');
  });

  it('should parse route patterns from file paths', () => {
    assert.deepEqual(parseRoutePattern('layout.tsx'), { type: 'layout', pattern: '/' });
    assert.deepEqual(parseRoutePattern('page.tsx'), { type: 'page', pattern: '/' });
    assert.deepEqual(parseRoutePattern('docs/layout.tsx'), { type: 'layout', pattern: '/docs' });
    assert.deepEqual(parseRoutePattern('docs/page.tsx'), { type: 'page', pattern: '/docs' });
    assert.deepEqual(parseRoutePattern('docs/[slug]/page.tsx'), { type: 'page', pattern: '/docs/:slug' });
    assert.deepEqual(parseRoutePattern('(marketing)/pricing/page.tsx'), { type: 'page', pattern: '/pricing' });
    assert.deepEqual(parseRoutePattern('about.tsx'), { type: 'page', pattern: '/about' });
    assert.deepEqual(parseRoutePattern('button.test.tsx'), { type: 'ignored', pattern: '' });
  });

  it('should extract route groups from relative file paths', () => {
    assert.equal(extractRouteGroup('(marketing)/pricing/page.tsx'), '(marketing)');
    assert.equal(extractRouteGroup('(docs)/layout.tsx'), '(docs)');
    assert.equal(extractRouteGroup('docs/quickstart/page.tsx'), undefined);
    assert.equal(extractRouteGroup('page.tsx'), undefined);
  });

  it('should compose nested layouts hierarchically (root -> inner -> page)', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout
    router.layout('/', ({ children }) => {
      return `<div id="root-shell">${children}</div>`;
    });

    // Docs layout (nested under root)
    router.layout('/docs', ({ children }) => {
      return `<aside id="docs-sidebar"></aside><main id="docs-main">${children}</main>`;
    });

    // Docs page
    router.page('/docs/getting-started', () => {
      return `<h1>Getting Started</h1>`;
    });

    const res = await app.fetch(new Request('http://localhost/docs/getting-started'));
    assert.equal(res.status, 200);
    const body = await res.text();

    assert.ok(body.includes('<div id="root-shell">'));
    assert.ok(body.includes('<aside id="docs-sidebar"></aside>'));
    assert.ok(body.includes('<main id="docs-main"><h1>Getting Started</h1></main>'));
  });

  it('should support isolate: true on layouts to exclude root wrappers', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout
    router.layout('/', ({ children }) => {
      return `<header>NAVBAR</header><div id="root">${children}</div>`;
    });

    // Isolated Docs layout (no navbar from root)
    router.layout(
      '/docs',
      ({ children }) => {
        return `<div id="standalone-docs">${children}</div>`;
      },
      { isolate: true }
    );

    router.page('/docs/intro', () => {
      return `<p>Intro Doc</p>`;
    });

    const res = await app.fetch(new Request('http://localhost/docs/intro'));
    const body = await res.text();

    assert.ok(!body.includes('NAVBAR'), 'Should not contain NAVBAR when isolate: true');
    assert.ok(body.includes('<div id="standalone-docs"><p>Intro Doc</p></div>'));
  });

  it('should serve CSS files with serveCss()', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-css-test-'));
    const cssFile = path.join(tmpDir, 'test.css');
    await fs.writeFile(cssFile, 'body { background: #000; }', 'utf8');

    router.serveCss(cssFile, '/custom.css');

    const res = await app.fetch(new Request('http://localhost/custom.css'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/css; charset=utf-8');
    const text = await res.text();
    assert.equal(text, 'body { background: #000; }');

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should automatically discover file-based routes and layouts with router.discover()', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-discover-test-'));
    const appDir = path.join(tmpDir, 'app');
    await fs.mkdir(path.join(appDir, 'docs', '[slug]'), { recursive: true });

    // 1. Root layout
    await fs.writeFile(
      path.join(appDir, 'layout.js'),
      `export default function Layout({ children }) { return "<div class='root'>" + children + "</div>"; }`,
      'utf8'
    );

    // 2. Home page
    await fs.writeFile(
      path.join(appDir, 'page.js'),
      `export default function Page() { return "<h1>Home Page</h1>"; }`,
      'utf8'
    );

    // 3. Docs dynamic page
    await fs.writeFile(
      path.join(appDir, 'docs', '[slug]', 'page.js'),
      `export default function DocPage({ params }) { return "<h2>Doc: " + params.slug + "</h2>"; }`,
      'utf8'
    );

    const discovered = await router.discover(appDir);
    assert.ok(discovered.layouts.includes('/'));
    assert.ok(discovered.pages.includes('/'));
    assert.ok(discovered.pages.includes('/docs/:slug'));

    // Test home page request
    const homeRes = await app.fetch(new Request('http://localhost/'));
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.ok(homeHtml.includes("<div class='root'><h1>Home Page</h1></div>"));

    // Test dynamic doc page request
    const docRes = await app.fetch(new Request('http://localhost/docs/quickstart'));
    assert.equal(docRes.status, 200);
    const docHtml = await docRes.text();
    assert.ok(docHtml.includes("<div class='root'><h2>Doc: quickstart</h2></div>"));

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
