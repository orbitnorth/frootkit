import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  createFullstackApp,
  findProjectRoot,
  resolveAppDir,
  resolveStylesPath,
  resolveDefaultAssets,
} from '../dist/index.js';

describe('⚡ Next.js-Style Zero-Config createFullstackApp & CLI Engine', () => {
  it('should find project root from current directory', () => {
    const root = findProjectRoot(process.cwd());
    assert.ok(root, 'Should resolve project root');
  });

  it('should resolve app directory automatically', () => {
    const appDir = resolveAppDir(process.cwd());
    assert.ok(appDir, 'Should resolve app directory');
  });

  it('should resolve styles path automatically', () => {
    const styles = resolveStylesPath(process.cwd());
    // May or may not have styles in froot-fullstack root, but function returns without crashing
    assert.ok(styles === null || typeof styles === 'string');
  });

  it('should resolve default assets like public and metadata files', () => {
    const assets = resolveDefaultAssets(process.cwd());
    assert.ok(Array.isArray(assets));
  });

  it('should instantiate createFullstackApp with zero boilerplate', async () => {
    const instance = await createFullstackApp({
      cwd: process.cwd(),
      autoListen: false,
      tailwind: false, // disable in quick unit test
    });

    assert.ok(instance.app, 'Should create Froot app instance');
    assert.ok(instance.router, 'Should create AppRouter instance');
    assert.equal(typeof instance.listen, 'function');
    assert.equal(typeof instance.build, 'function');

    // Test standard app.fetch
    const res = await instance.app.fetch(new Request('http://localhost/non-existent'));
    assert.equal(res.status, 404);
  });

  it('should verify getPidOnPort and clean server close', async () => {
    const { getPidOnPort, killProcessOnPort } = await import('../src/process.js');
    assert.equal(typeof getPidOnPort, 'function');
    assert.equal(typeof killProcessOnPort, 'function');

    const testApp = await createFullstackApp({
      cwd: process.cwd(),
      autoListen: false,
      tailwind: false,
    });

    const server = testApp.listen(34567, undefined, { maxRetries: 0 });
    // Allow socket to bind
    await new Promise((r) => setTimeout(r, 80));

    const pid = getPidOnPort(34567);
    assert.equal(pid, process.pid);

    await testApp.close();
    await new Promise((r) => setTimeout(r, 80));

    const postClosePid = getPidOnPort(34567);
    assert.equal(postClosePid, null, 'Port should be completely free after close()');
  });
});

