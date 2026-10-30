/**
 * Tailwind CSS v4 Engine for Froot Fullstack.
 * Provides zero-configuration Tailwind v4 compilation, development hot-reloading watch mode,
 * automatic input CSS generation, and seamless integration with AppRouter and SSG.
 */

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TailwindOptions {
  /**
   * Path to the input CSS file with `@import "tailwindcss";` and `@theme`.
   * Defaults to searching `src/styles.css`, `src/globals.css`, or `styles.css`.
   */
  input?: string;

  /**
   * Path to output compiled CSS file.
   * Defaults to `dist/styles.css` (or `.froot/styles.css`).
   */
  output?: string;

  /**
   * Public URL path where the compiled CSS is served.
   * Defaults to `/styles.css`.
   */
  routePath?: string;

  /**
   * Whether to watch for changes during development.
   * Defaults to `process.env.NODE_ENV !== 'production'`.
   */
  watch?: boolean;

  /**
   * Optimize and minify generated CSS.
   * Defaults to `process.env.NODE_ENV === 'production'`.
   */
  minify?: boolean;

  /**
   * Project working directory. Defaults to `process.cwd()`.
   */
  cwd?: string;

  /**
   * Automatically generate a Next.js-style Tailwind v4 CSS starter file if not found.
   * Defaults to true.
   */
  autoCreate?: boolean;
}

export interface TailwindInstance {
  input: string;
  output: string;
  routePath: string;
  stopWatcher: () => void;
}

const DEFAULT_TAILWIND_V4_CSS = `@import "tailwindcss";

@theme {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --color-brand-50: #ecfdf5;
  --color-brand-100: #d1fae5;
  --color-brand-200: #a7f3d0;
  --color-brand-300: #6ee7b7;
  --color-brand-400: #34d399;
  --color-brand-500: #10b981;
  --color-brand-600: #059669;
  --color-brand-700: #047857;
  --color-brand-800: #065f46;
  --color-brand-900: #064e3b;
  --color-brand-950: #022c22;
}

:root {
  color-scheme: dark;
}
`;

/**
 * Resolves the location of the Tailwind v4 executable.
 */
export function resolveTailwindBinary(cwd: string = process.cwd()): { bin: string; argsPrefix: string[] } | null {
  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'tailwindcss.cmd' : 'tailwindcss';

  // 1. Check local node_modules/.bin/tailwindcss
  const candidates = [
    path.join(cwd, 'node_modules', '.bin', binName),
    path.join(cwd, '..', 'node_modules', '.bin', binName),
    path.join(cwd, '..', '..', 'node_modules', '.bin', binName),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return { bin: candidate, argsPrefix: [] };
    }
  }

  // 2. Check npx
  const npxBin = isWindows ? 'npx.cmd' : 'npx';
  return { bin: npxBin, argsPrefix: ['tailwindcss'] };
}

/**
 * Resolves input and output paths for Tailwind CSS v4.
 */
export async function resolveTailwindPaths(options: TailwindOptions = {}): Promise<{
  input: string;
  output: string;
  routePath: string;
  cwd: string;
}> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const routePath = options.routePath || '/styles.css';

  let input = options.input ? path.resolve(cwd, options.input) : '';

  if (!input) {
    const defaultCandidates = [
      path.join(cwd, 'src', 'styles.css'),
      path.join(cwd, 'src', 'globals.css'),
      path.join(cwd, 'styles.css'),
      path.join(cwd, 'src', 'app', 'globals.css'),
      path.join(cwd, 'app', 'globals.css'),
    ];

    for (const cand of defaultCandidates) {
      if (fsSync.existsSync(cand)) {
        input = cand;
        break;
      }
    }

    if (!input) {
      // Auto-create default input file
      const autoDir = fsSync.existsSync(path.join(cwd, 'src')) ? path.join(cwd, 'src') : cwd;
      input = path.join(autoDir, 'styles.css');
      if (options.autoCreate !== false) {
        await fs.mkdir(path.dirname(input), { recursive: true });
        await fs.writeFile(input, DEFAULT_TAILWIND_V4_CSS, 'utf8');
      }
    }
  }

  let output = options.output
    ? path.resolve(cwd, options.output)
    : path.join(cwd, '.froot', 'styles.css');

  await fs.mkdir(path.dirname(output), { recursive: true });

  return { input, output, routePath, cwd };
}

/**
 * Compiles Tailwind CSS v4 into production or development CSS.
 */
export async function compileTailwind(options: TailwindOptions = {}): Promise<string> {
  const { input, output, cwd } = await resolveTailwindPaths(options);
  const minify = options.minify ?? (process.env['NODE_ENV'] === 'production');

  const binary = resolveTailwindBinary(cwd);

  if (binary) {
    const args = [
      ...binary.argsPrefix,
      '-i',
      input,
      '-o',
      output,
    ];

    if (minify) {
      args.push('--minify');
    }

    try {
      await execFileAsync(binary.bin, args, { cwd, shell: process.platform === 'win32' });
      if (fsSync.existsSync(output)) {
        return await fs.readFile(output, 'utf8');
      }
    } catch {
      // Fallback if execution failed
    }
  }

  // Graceful fallback: return and write starter CSS
  const fallbackCss = DEFAULT_TAILWIND_V4_CSS;
  await fs.writeFile(output, fallbackCss, 'utf8');
  return fallbackCss;
}

/**
 * Spawns a background watcher for Tailwind CSS v4 during development.
 */
export function watchTailwind(options: TailwindOptions = {}): { process: any; stop: () => void } {
  const cwd = path.resolve(options.cwd || process.cwd());
  const input = options.input ? path.resolve(cwd, options.input) : path.join(cwd, 'src', 'styles.css');
  const output = options.output ? path.resolve(cwd, options.output) : path.join(cwd, '.froot', 'styles.css');

  const binary = resolveTailwindBinary(cwd);
  if (!binary) {
    return { process: null, stop: () => {} };
  }

  const args = [
    ...binary.argsPrefix,
    '-i',
    input,
    '-o',
    output,
    '--watch',
  ];

  const child = spawn(binary.bin, args, {
    cwd,
    stdio: 'ignore',
    detached: false,
    shell: process.platform === 'win32',
  });

  const stop = () => {
    try {
      if (child && !child.killed) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
        } else {
          child.kill('SIGTERM');
        }
      }
    } catch {
      // ignore
    }
  };

  process.once('exit', stop);
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  return { process: child, stop };
}
