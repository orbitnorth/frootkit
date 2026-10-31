import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { Froot } from 'frootjs';
import { createAppRouter } from '../dist/router/router.js';
import { discoverRoutes, parseRoutePattern } from '../dist/router/file-router.js';

describe('⚡ FrootKit Next.js-Style API Routes', () => {
  it('identifies route.ts as an API route pattern', () => {
    assert.deepEqual(parseRoutePattern('api/health/route.ts'), {
      type: 'api',
      pattern: '/api/health',
    });

    assert.deepEqual(parseRoutePattern('api/users/[id]/route.ts'), {
      type: 'api',
      pattern: '/api/users/:id',
    });

    assert.deepEqual(parseRoutePattern('api/posts/[...slug]/route.ts'), {
      type: 'api',
      pattern: '/api/posts/*',
    });
  });

  it('mounts manual API route with GET and POST handlers on top of Froot', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.api('/api/status', {
      GET: async (req, { params }) => {
        return Response.json({ status: 'ok', runtime: 'frootkit' });
      },
      POST: async (req, { params }) => {
        const body = await req.json();
        return Response.json({ received: body }, { status: 201 });
      },
    });

    // Test GET
    const getRes = await app.fetch(new Request('http://localhost/api/status'));
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.status, 'ok');
    assert.equal(getData.runtime, 'frootkit');

    // Test POST
    const postRes = await app.fetch(
      new Request('http://localhost/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: 'pong' }),
      })
    );
    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.deepEqual(postData.received, { ping: 'pong' });
  });

  it('supports dynamic path parameters in API routes e.g. /api/users/:id', async () => {
    const app = new Froot();
    const router = createAppRouter(app);

    router.api('/api/users/:id', {
      GET: async (req, { params }) => {
        return Response.json({ userId: params.id });
      },
      DELETE: async (req, { params }) => {
        return Response.json({ deleted: true, userId: params.id });
      },
    });

    const getRes = await app.fetch(new Request('http://localhost/api/users/user_42'));
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.userId, 'user_42');

    const delRes = await app.fetch(
      new Request('http://localhost/api/users/user_99', { method: 'DELETE' })
    );
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.deleted, true);
    assert.equal(delData.userId, 'user_99');
  });

  it('discovers route.ts from directory and generates routes-manifest.json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frootkit-api-test-'));
    const appDir = path.join(tempDir, 'src', 'app');
    const healthDir = path.join(appDir, 'api', 'health');
    await fs.mkdir(healthDir, { recursive: true });

    // Create route.js file in app directory
    await fs.writeFile(
      path.join(healthDir, 'route.js'),
      `export async function GET() { return Response.json({ healthy: true }); }`,
      'utf8'
    );

    // Create a page.js
    await fs.writeFile(
      path.join(appDir, 'page.js'),
      `export default function Page() { return "Home"; }`,
      'utf8'
    );

    const app = new Froot();
    const router = createAppRouter(app);
    const discovered = await router.discover(appDir);

    assert.ok(discovered.apis.includes('/api/health'));

    // Test API route live dispatch
    const res = await app.fetch(new Request('http://localhost/api/health'));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.healthy, true);

    // Test SSG export includes routes-manifest.json
    const outDir = path.join(tempDir, '.froot');
    const exportResult = await router.exportStatic({ outDir });
    assert.ok(exportResult.filesWritten.some((f) => f.includes('routes-manifest.json')));

    const manifest = JSON.parse(await fs.readFile(path.join(outDir, 'routes-manifest.json'), 'utf8'));
    assert.ok(manifest.apiRoutes.some((a: any) => a.pattern === '/api/health'));

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });
});
