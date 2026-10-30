import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { Froot } from 'frootjs';
import { createAppRouter, compileTailwind, resolveTailwindPaths } from '../dist/index.js';

describe('🎨 Tailwind CSS v4 Engine for Fullstack', () => {
  it('should resolve default Tailwind paths and auto-create starter styles.css', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-tw-test-'));

    try {
      const paths = await resolveTailwindPaths({
        cwd: tmpDir,
      });

      assert.ok(paths.input.endsWith('styles.css'), 'input should end with styles.css');
      assert.ok(paths.output.endsWith('styles.css'), 'output should end with styles.css');
      assert.equal(paths.routePath, '/styles.css');

      const content = await fs.readFile(paths.input, 'utf8');
      assert.ok(content.includes('@import "tailwindcss";'), 'should contain @import "tailwindcss"');
      assert.ok(content.includes('@theme'), 'should contain @theme');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should compile Tailwind CSS and serve via router.enableTailwind()', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-tw-serve-'));

    try {
      const app = new Froot();
      const router = createAppRouter(app);

      const customCssInput = path.join(tmpDir, 'src', 'styles.css');
      await fs.mkdir(path.dirname(customCssInput), { recursive: true });
      await fs.writeFile(
        customCssInput,
        `@import "tailwindcss";\n@theme { --color-froot-brand: #10b981; }\n.custom-froot-hero { color: var(--color-froot-brand); }`,
        'utf8'
      );

      const tw = await router.enableTailwind({
        cwd: tmpDir,
        input: customCssInput,
        output: path.join(tmpDir, 'dist', 'styles.css'),
        watch: false,
      });

      assert.equal(tw.routePath, '/styles.css');

      // Test serving CSS route
      const req = new Request('http://localhost/styles.css');
      const res = await app.fetch(req);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'text/css; charset=utf-8');

      const text = await res.text();
      assert.ok(text.length > 0, 'CSS content should not be empty');

      router.stopTailwind();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
