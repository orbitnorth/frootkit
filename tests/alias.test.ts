import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ensureImportAlias, stripJsonComments } from '../src/alias.js';

describe('⚡ Next.js-Style Default Import Alias (@/*)', () => {
  it('strips json comments safely before parsing', () => {
    const jsonWithComments = `
      // Root level comment
      {
        /* multi-line
           compiler option comment */
        "compilerOptions": {
          "target": "ES2022" // inline comment
        }
      }
    `;
    const clean = stripJsonComments(jsonWithComments);
    const parsed = JSON.parse(clean);
    assert.strictEqual(parsed.compilerOptions.target, 'ES2022');
  });

  it('automatically adds @/* alias to existing tsconfig.json missing paths', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-alias-test-'));
    try {
      await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
      const initialTsConfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
        },
      };
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        JSON.stringify(initialTsConfig, null, 2),
        'utf8'
      );

      const result = ensureImportAlias({ cwd: tmpDir });
      assert.strictEqual(result.configured, true);
      assert.strictEqual(result.alias, '@/*');
      assert.strictEqual(result.target, './src/*');

      const updated = JSON.parse(await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf8'));
      assert.strictEqual(updated.compilerOptions.baseUrl, '.');
      assert.deepStrictEqual(updated.compilerOptions.paths['@/*'], ['./src/*']);

      // Idempotency: second run should detect it is already configured
      const secondRun = ensureImportAlias({ cwd: tmpDir });
      assert.strictEqual(secondRun.configured, false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('points @/* to ./* if no src directory exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-alias-nosrc-'));
    try {
      await fs.mkdir(path.join(tmpDir, 'app'), { recursive: true });
      const initialTsConfig = {
        compilerOptions: {
          target: 'ES2022',
        },
      };
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        JSON.stringify(initialTsConfig, null, 2),
        'utf8'
      );

      const result = ensureImportAlias({ cwd: tmpDir });
      assert.strictEqual(result.configured, true);
      assert.strictEqual(result.target, './*');

      const updated = JSON.parse(await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf8'));
      assert.deepStrictEqual(updated.compilerOptions.paths['@/*'], ['./*']);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates tsconfig.json from scratch if missing and typescript files exist', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'froot-alias-scratch-'));
    try {
      await fs.mkdir(path.join(tmpDir, 'src', 'app'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'src', 'app', 'page.tsx'), 'export default () => <h1>Hi</h1>;', 'utf8');

      const result = ensureImportAlias({ cwd: tmpDir });
      assert.strictEqual(result.configured, true);
      assert.strictEqual(path.basename(result.filePath), 'tsconfig.json');

      const created = JSON.parse(await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf8'));
      assert.strictEqual(created.compilerOptions.baseUrl, '.');
      assert.deepStrictEqual(created.compilerOptions.paths['@/*'], ['./src/*']);
      assert.strictEqual(created.compilerOptions.jsxImportSource, 'preact');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
