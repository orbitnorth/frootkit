/**
 * High-Level Next.js-Style Fullstack Application Factory and Zero-Config SSG Builder.
 * Abstracts away boilerplate: server entry, path resolution, Tailwind v4 pipeline,
 * file-based route discovery, static site generation, and dev servers.
 */

import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { Froot } from 'frootjs';
import { createAppRouter, AppRouter } from './router/router.js';
import type { TailwindOptions } from './router/tailwind.js';
import type { StaticExportOptions, StaticExportResult } from './router/types.js';

export interface FullstackAppOptions {
  /**
   * Project root working directory. Defaults to auto-resolving nearest directory with package.json or process.cwd().
   */
  cwd?: string;

  /**
   * Directory containing Next.js-style file-based routes (layout.tsx, page.tsx, [slug]/page.tsx).
   * Defaults to auto-detecting `src/app`, `app`, or `web/src/app`.
   */
  appDir?: string;

  /**
   * Path to main Tailwind CSS v4 input file.
   * Defaults to auto-detecting `src/styles.css`, `styles.css`, `src/globals.css`, or `src/app/globals.css`.
   */
  styles?: string;

  /**
   * Output directory for compiled assets and SSG static HTML files.
   * Defaults to `.froot` in the project root (hidden build directory, similar to `.next` in Next.js).
   */
  outDir?: string;

  /**
   * Tailwind CSS integration options or `false` to disable.
   * Defaults to true (auto-detect and compile with Tailwind v4).
   */
  tailwind?: boolean | TailwindOptions;

  /**
   * Additional static assets to copy during export.
   * Defaults to auto-detecting `public/` directory and standard files (`llms.txt`, `_redirects`, `netlify.toml`).
   */
  copyAssets?: Array<{ from: string; to?: string }>;

  /**
   * Port for the server to listen on. Defaults to process.env.PORT or 3000.
   */
  port?: number;

  /**
   * Whether to automatically start listening on the port when executed directly as a script.
   * Defaults to true (bypassed in test environments and during SSG builds).
   */
  autoListen?: boolean;
}

export interface FullstackAppInstance {
  app: Froot;
  router: AppRouter;
  appDir: string;
  outDir: string;
  options: FullstackAppOptions;
  listen: (port?: number, cb?: () => void) => any;
  build: (overrideOptions?: Partial<StaticExportOptions>) => Promise<StaticExportResult>;
}

export type FrootKitOptions = FullstackAppOptions;
export type FrootKitInstance = FullstackAppInstance;

/**
 * Finds the nearest directory containing package.json starting from `startDir`.
 */
export function findProjectRoot(startDir: string = process.cwd()): string {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    if (fsSync.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(startDir);
}

/**
 * Auto-detects the Next.js-style `app` directory.
 */
export function resolveAppDir(cwd: string, explicitAppDir?: string): string {
  if (explicitAppDir) {
    return path.resolve(cwd, explicitAppDir);
  }

  const candidates = [
    path.join(cwd, 'src', 'app'),
    path.join(cwd, 'app'),
    path.join(cwd, 'web', 'src', 'app'),
    path.join(cwd, 'web', 'app'),
  ];

  for (const cand of candidates) {
    if (fsSync.existsSync(cand) && fsSync.statSync(cand).isDirectory()) {
      return cand;
    }
  }

  // Fallback to src/app even if not yet populated
  return path.join(cwd, 'src', 'app');
}

/**
 * Auto-detects the Tailwind CSS v4 input file.
 */
export function resolveStylesPath(cwd: string, explicitStyles?: string): string | null {
  if (explicitStyles) {
    const resolved = path.resolve(cwd, explicitStyles);
    return fsSync.existsSync(resolved) ? resolved : null;
  }

  const candidates = [
    path.join(cwd, 'src', 'styles.css'),
    path.join(cwd, 'src', 'globals.css'),
    path.join(cwd, 'styles.css'),
    path.join(cwd, 'src', 'app', 'globals.css'),
    path.join(cwd, 'app', 'globals.css'),
    path.join(cwd, 'web', 'src', 'styles.css'),
    path.join(cwd, 'web', 'styles.css'),
  ];

  for (const cand of candidates) {
    if (fsSync.existsSync(cand)) {
      return cand;
    }
  }

  return null;
}

/**
 * Auto-detects common static assets to copy during export (e.g. public directory, metadata files).
 */
export function resolveDefaultAssets(cwd: string): Array<{ from: string; to?: string }> {
  const assets: Array<{ from: string; to?: string }> = [];

  // 1. Next.js standard public/ folder
  const publicDirs = [path.join(cwd, 'public'), path.join(cwd, 'web', 'public')];
  for (const p of publicDirs) {
    if (fsSync.existsSync(p) && fsSync.statSync(p).isDirectory()) {
      assets.push({ from: p, to: '.' });
      break;
    }
  }

  // 2. Standard deployment and metadata files
  const candidateFiles = [
    'llms.txt',
    'llms-full.txt',
    '_redirects',
    'netlify.toml',
    'favicon.ico',
    'robots.txt',
  ];

  for (const file of candidateFiles) {
    const checks = [path.join(cwd, file), path.join(cwd, 'web', file)];
    for (const check of checks) {
      if (fsSync.existsSync(check) && fsSync.statSync(check).isFile()) {
        assets.push({ from: check });
        break;
      }
    }
  }

  return assets;
}

/**
 * Creates and initializes a zero-boilerplate Next.js-style Fullstack Application.
 * Automatically resolves paths, Tailwind v4 CSS pipeline, file-based routes, and SSG capabilities.
 */
export async function createFullstackApp(options: FullstackAppOptions = {}): Promise<FullstackAppInstance> {
  const cwd = path.resolve(options.cwd || findProjectRoot());
  process.env['FROOT_CWD'] = cwd;
  const appDir = resolveAppDir(cwd, options.appDir);
  const defaultOut = appDir.includes(path.sep + 'web' + path.sep) && !cwd.endsWith('web') ? 'web/.froot' : '.froot';
  const outDir = path.resolve(cwd, options.outDir || defaultOut);
  const port = options.port || Number(process.env['PORT'] || 3000);

  const app = new Froot();
  const router = createAppRouter(app);

  // 1. Enable Tailwind CSS v4 automatically if styles found and not disabled
  if (options.tailwind !== false) {
    const stylesInput = resolveStylesPath(cwd, options.styles);
    if (stylesInput) {
      const tailwindConfig: TailwindOptions = typeof options.tailwind === 'object' ? options.tailwind : {};
      await router.enableTailwind({
        input: stylesInput,
        output: path.join(outDir, 'styles.css'),
        routePath: '/styles.css',
        cwd,
        ...tailwindConfig,
      });
    }
  }

  // 2. Discover file-based routes in app directory
  if (fsSync.existsSync(appDir)) {
    await router.discover(appDir);
  }

  // 3. Define listen method with automatic port hunting & EADDRINUSE handling
  const listen = (
    p: number = port,
    cb?: () => void,
    listenOpts?: { maxRetries?: number }
  ) => {
    const isDev = process.env['NODE_ENV'] !== 'production';
    const maxRetries = listenOpts?.maxRetries ?? (isDev ? 10 : 0);
    let currentPort = p;

    let serverInstance: any = null;

    const tryListen = (): any => {
      serverInstance = app.listen(currentPort, () => {
        if (cb) {
          cb();
        } else {
          console.log(`Froot Fullstack server listening at http://localhost:${currentPort}`);
        }
      });

      serverInstance.once('error', (err: any) => {
        if (err?.code === 'EADDRINUSE') {
          if (currentPort - p < maxRetries) {
            console.log(`  - Port ${currentPort} is in use, trying ${currentPort + 1}...`);
            currentPort++;
            tryListen();
          } else {
            console.error(
              `\n  ✕ Port ${currentPort} is already in use. Specify a different port using --port <port> or stop the process running on port ${currentPort}.\n`
            );
          }
        } else {
          console.error('\n  ✕ Server error:', err);
        }
      });

      return serverInstance;
    };

    return tryListen();
  };

  // 4. Define build method
  const build = async (overrideOptions: Partial<StaticExportOptions> = {}): Promise<StaticExportResult> => {
    const defaultAssets = resolveDefaultAssets(cwd);
    const combinedAssets = [...defaultAssets, ...(options.copyAssets || []), ...(overrideOptions.copyAssets || [])];

    return router.exportStatic({
      outDir: overrideOptions.outDir || outDir,
      copyAssets: combinedAssets,
      ...overrideOptions,
    });
  };

  // 5. Auto-listen if executed directly
  const isDirectEntry = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(cwd, 'src/server.tsx') || path.basename(process.argv[1]).includes('server') : false;
  if (options.autoListen !== false && isDirectEntry && process.env['NODE_ENV'] !== 'test' && !process.env['FROOT_BUILD']) {
    listen();
  }

  return {
    app,
    router,
    appDir,
    outDir,
    options,
    listen,
    build,
  };
}

/**
 * Alias for createFullstackApp with standard FrootKit naming.
 */
export const createFrootKit = createFullstackApp;
export const createFrootKitApp = createFullstackApp;

/**
 * Next.js-style zero-config SSG build function.
 * Automatically discovers routes, compiles Tailwind v4, and exports static pages to .froot/.
 */
export async function build(options: FullstackAppOptions & Partial<StaticExportOptions> = {}): Promise<StaticExportResult> {
  process.env['FROOT_BUILD'] = 'true';
  const instance = await createFullstackApp(options);
  console.log('Building FrootKit site with Next.js App Router conventions...');
  const result = await instance.build(options);
  console.log(`✓ SSG Export complete in ${result.durationMs}ms (${result.renderedRoutes.length} routes pre-rendered)`);
  return result;
}
