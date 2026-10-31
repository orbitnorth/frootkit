import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { h } from 'preact';
import { Froot } from 'frootjs';
import {
  createAppRouter,
  notFound,
  NotFoundError,
  isNotFoundError,
  serializeState,
  deserializeState,
  HydrationScript,
  injectHydrationScript,
  renderPreact,
  formatRouteSegment,
  parseRoutePattern,
} from '../src/index.js';

describe('⚡ FrootKit Routing Contract & Hydration Specifications', () => {
  it('contract: formats dynamic segments, catch-all, and optional catch-all', () => {
    assert.equal(formatRouteSegment('[id]'), ':id');
    assert.equal(formatRouteSegment('[slug]'), ':slug');
    assert.equal(formatRouteSegment('[...catchAll]'), '*');
    assert.equal(formatRouteSegment('[[...optional]]'), ':optional?');
    assert.equal(formatRouteSegment('(marketing)'), '');
    assert.equal(formatRouteSegment('(dashboard)'), '');
  });

  it('contract: parses route patterns into layouts, pages, not-found, error, and API routes', () => {
    assert.deepEqual(parseRoutePattern('layout.tsx'), { type: 'layout', pattern: '/' });
    assert.deepEqual(parseRoutePattern('page.tsx'), { type: 'page', pattern: '/' });
    assert.deepEqual(parseRoutePattern('not-found.tsx'), { type: 'not-found', pattern: '/' });
    assert.deepEqual(parseRoutePattern('error.tsx'), { type: 'error', pattern: '/' });
    assert.deepEqual(parseRoutePattern('dashboard/layout.tsx'), { type: 'layout', pattern: '/dashboard' });
    assert.deepEqual(parseRoutePattern('dashboard/page.tsx'), { type: 'page', pattern: '/dashboard' });
    assert.deepEqual(parseRoutePattern('api/auth/route.ts'), { type: 'api', pattern: '/api/auth' });
    assert.deepEqual(parseRoutePattern('(marketing)/about/page.tsx'), { type: 'page', pattern: '/about' });
  });

  it('contract: handles 404s via notFound() and unmatched route fallbacks', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.layout('/', ({ children }) => (
      h('html', null,
        h('head', null, h('title', null, 'App Shell')),
        h('body', null, children)
      )
    ));

    // Custom Not Found View
    router.setNotFound(() => (
      h('div', { class: 'custom-404' }, 'Custom 404: The requested resource does not exist.')
    ));

    // Page that explicitly calls notFound()
    router.page('/products/:id', ({ params }) => {
      if (params.id === 'unknown') {
        notFound();
      }
      return h('div', null, `Product ${params.id}`);
    });

    // 1. Success route
    const okRes = await app.fetch(new Request('http://localhost/products/123'));
    assert.equal(okRes.status, 200);
    const okText = await okRes.text();
    assert.ok(okText.includes('Product 123'));

    // 2. notFound() trigger
    const notFoundRes = await app.fetch(new Request('http://localhost/products/unknown'));
    assert.equal(notFoundRes.status, 404);
    const notFoundText = await notFoundRes.text();
    assert.ok(notFoundText.includes('Custom 404'));
    assert.ok(notFoundText.includes('<html')); // Wrapped in root layout

    // 3. Unmatched route trigger
    const unmatchedRes = await app.fetch(new Request('http://localhost/non-existent-route'));
    assert.equal(unmatchedRes.status, 404);
    const unmatchedText = await unmatchedRes.text();
    assert.ok(unmatchedText.includes('Custom 404'));
  });

  it('contract: handles error boundaries (500) gracefully when exceptions are thrown', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.layout('/', ({ children }) => (
      h('html', null,
        h('body', null, children)
      )
    ));

    router.setErrorBoundary(({ error }) => (
      h('div', { class: 'error-boundary' }, `Caught Exception: ${error.message}`)
    ));

    router.page('/buggy', () => {
      throw new Error('Database connection failed during SSR');
    });

    const res = await app.fetch(new Request('http://localhost/buggy'));
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(text.includes('Caught Exception: Database connection failed during SSR'));
    assert.ok(text.includes('<html'));
  });

  it('contract: server data loading with loader() and automatic hydration payload injection', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.layout('/', ({ children }) => (
      h('html', null,
        h('body', null, children)
      )
    ));

    // Page with server loader function
    router.page(
      '/users/:id',
      ({ data, params }) => {
        return h('div', { id: 'user-profile' },
          h('h1', null, data.name),
          h('p', null, `Role: ${data.role} (User ${params.id})`)
        );
      },
      {
        loader: async ({ params }) => {
          // Simulated server-side database query
          return {
            id: params.id,
            name: `Developer #${params.id}`,
            role: 'Administrator',
            features: ['ssr', 'hydration', 'anti-ai-slop'],
          };
        },
      }
    );

    const res = await app.fetch(new Request('http://localhost/users/42'));
    assert.equal(res.status, 200);
    const html = await res.text();

    // Verify rendered HTML
    assert.ok(html.includes('Developer #42'));
    assert.ok(html.includes('Role: Administrator'));

    // Verify state serialization into <script id="__FROOT_DATA__">
    assert.ok(html.includes('<script id="__FROOT_DATA__" type="application/json">'));
    assert.ok(html.includes('Developer #42'));
    assert.ok(html.includes('anti-ai-slop'));
  });

  it('contract: page action() handles POST form submissions / server mutations', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.page(
      '/login',
      () => h('form', { method: 'POST' }, h('button', null, 'Submit')),
      {
        action: async ({ request }) => {
          const body = await request.text();
          return Response.json({ success: true, received: body }, { status: 201 });
        },
      }
    );

    // GET request renders form
    const getRes = await app.fetch(new Request('http://localhost/login'));
    assert.equal(getRes.status, 200);

    // POST request invokes server action
    const postRes = await app.fetch(
      new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );
    assert.equal(postRes.status, 201);
    const json = await postRes.json();
    assert.equal(json.success, true);
    assert.ok(json.received.includes('test@example.com'));
  });

  it('contract: safe JSON state serialization prevents XSS and premature script termination', () => {
    const maliciousPayload = {
      bio: '</script><script>alert("xss")</script>',
      query: '<img src=x onerror=alert(1)>',
      symbol: '&amp; <tag>',
      unicode: 'Line 1\u2028Line 2\u2029Line 3',
    };

    const serialized = serializeState(maliciousPayload);

    // Must NOT contain unescaped raw '<' or '>'
    assert.ok(!serialized.includes('</script>'));
    assert.ok(!serialized.includes('<img'));
    assert.ok(serialized.includes('\\u003c/script\\u003e'));
    assert.ok(serialized.includes('\\u003cimg'));
    assert.ok(serialized.includes('\\u0026amp;'));

    // Deserialization in browser must restore exact original content
    const restored = deserializeState(serialized);
    assert.deepEqual(restored, maliciousPayload);
  });

  it('contract: injectHydrationScript safely places payload before </body>', () => {
    const baseHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><div id="app">Hello</div></body></html>';
    const payload = { counter: 10, user: 'alex' };

    const injected = injectHydrationScript(baseHtml, payload);
    assert.ok(injected.includes('<script id="__FROOT_DATA__" type="application/json">'));
    assert.ok(injected.indexOf('<script id="__FROOT_DATA__"') < injected.indexOf('</body>'));
  });
});
