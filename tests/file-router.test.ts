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

  it('should support directory-scoped not-found files and wrap inside their matching layouts', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-not-found-test-'));
    const appDir = path.join(tmpDir, 'app');
    await fs.mkdir(path.join(appDir, 'dashboard', 'settings'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'blog'), { recursive: true });

    // 1. Root layout & root not-found
    await fs.writeFile(
      path.join(appDir, 'layout.js'),
      `export default function RootLayout({ children }) { return "<div id='root-shell'>" + children + "</div>"; }`,
      'utf8'
    );
    await fs.writeFile(
      path.join(appDir, 'not-found.js'),
      `export default function RootNotFound() { return "<h1 id='root-404'>Root 404: Global Not Found</h1>"; }`,
      'utf8'
    );

    // 2. Dashboard layout & dashboard not-found
    await fs.writeFile(
      path.join(appDir, 'dashboard', 'layout.js'),
      `export default function DashboardLayout({ children }) { return "<div id='dashboard-shell'><aside>Sidebar</aside><main>" + children + "</main></div>"; }`,
      'utf8'
    );
    await fs.writeFile(
      path.join(appDir, 'dashboard', 'not-found.js'),
      `export default function DashboardNotFound({ currentPath }) { return "<div id='dashboard-404'>Dashboard Resource Not Found at " + currentPath + "</div>"; }`,
      'utf8'
    );
    await fs.writeFile(
      path.join(appDir, 'dashboard', 'page.js'),
      `export default function DashboardPage() { return "<h1>Dashboard Home</h1>"; }`,
      'utf8'
    );

    // 3. Blog layout & blog not-found
    await fs.writeFile(
      path.join(appDir, 'blog', 'layout.js'),
      `export default function BlogLayout({ children }) { return "<article id='blog-shell'>" + children + "</article>"; }`,
      'utf8'
    );
    await fs.writeFile(
      path.join(appDir, 'blog', 'not-found.js'),
      `export default function BlogNotFound() { return "<p id='blog-404'>Post or Author does not exist.</p>"; }`,
      'utf8'
    );

    const discovered = await router.discover(appDir);
    assert.ok(discovered.notFounds?.includes('/'));
    assert.ok(discovered.notFounds?.includes('/dashboard'));
    assert.ok(discovered.notFounds?.includes('/blog'));

    // A. Unmatched root path -> Root 404 wrapped inside root layout
    const rootRes = await app.fetch(new Request('http://localhost/non-existent-global-page'));
    assert.equal(rootRes.status, 404);
    const rootHtml = await rootRes.text();
    assert.ok(rootHtml.includes("<div id='root-shell'>"));
    assert.ok(rootHtml.includes("<h1 id='root-404'>Root 404: Global Not Found</h1>"));
    assert.ok(!rootHtml.includes("id='dashboard-shell'"));

    // B. Unmatched dashboard path -> Dashboard 404 wrapped inside DashboardLayout AND RootLayout!
    const dashRes = await app.fetch(new Request('http://localhost/dashboard/settings/unknown-tab'));
    assert.equal(dashRes.status, 404);
    const dashHtml = await dashRes.text();
    assert.ok(dashHtml.includes("<div id='root-shell'>"), 'Must be wrapped in root layout');
    assert.ok(dashHtml.includes("<div id='dashboard-shell'><aside>Sidebar</aside><main>"), 'Must be wrapped in dashboard layout');
    assert.ok(dashHtml.includes("<div id='dashboard-404'>Dashboard Resource Not Found at /dashboard/settings/unknown-tab</div>"), 'Must render directory-scoped not-found view');

    // C. Unmatched blog path -> Blog 404 wrapped inside BlogLayout AND RootLayout!
    const blogRes = await app.fetch(new Request('http://localhost/blog/missing-article-slug'));
    assert.equal(blogRes.status, 404);
    const blogHtml = await blogRes.text();
    assert.ok(blogHtml.includes("<div id='root-shell'>"));
    assert.ok(blogHtml.includes("<article id='blog-shell'>"));
    assert.ok(blogHtml.includes("<p id='blog-404'>Post or Author does not exist.</p>"));

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should trigger directory-scoped not-found inside its layout when notFound() is thrown', async () => {
    const { notFound } = await import('../dist/index.js');
    const app = new Froot();
    const router = createAppRouter(app);

    // Root layout
    router.layout('/', ({ children }) => `<div class="root">${children}</div>`);
    router.notFound('/', () => `<h1>Root 404</h1>`);

    // Store layout & store not-found
    router.layout('/store', ({ children }) => `<nav class="store-nav"></nav><div class="store">${children}</div>`);
    router.notFound('/store', ({ currentPath }) => `<div class="store-404">Item at ${currentPath} is out of stock or missing</div>`);

    // Route that calls notFound()
    router.page('/store/items/:id', ({ params }) => {
      if (params.id === 'missing-item') {
        notFound();
      }
      return `<h1>Item ${params.id}</h1>`;
    });

    // Valid item
    const okRes = await app.fetch(new Request('http://localhost/store/items/item-123'));
    assert.equal(okRes.status, 200);
    const okHtml = await okRes.text();
    assert.ok(okHtml.includes('Item item-123'));

    // Missing item calling notFound() -> renders store notFound inside store layout + root layout!
    const missingRes = await app.fetch(new Request('http://localhost/store/items/missing-item'));
    assert.equal(missingRes.status, 404);
    const missingHtml = await missingRes.text();
    assert.ok(missingHtml.includes('<div class="root">'));
    assert.ok(missingHtml.includes('<nav class="store-nav"></nav><div class="store">'));
    assert.ok(missingHtml.includes('Item at /store/items/missing-item is out of stock or missing'));
  });
});
