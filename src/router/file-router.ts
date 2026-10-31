/**
 * Next.js-style File-Based Router Scanner for Froot and Preact.
 * Recursively discovers nested layouts, dynamic routes, static parameters, and metadata.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { AppRouter } from './router.js';
import type { PageOptions } from './types.js';

export interface DiscoverOptions {
  /** The root directory to scan (e.g. 'src/app' or 'src/pages') */
  dir: string;
}

export interface DiscoveredRoute {
  type: 'layout' | 'page' | 'api';
  filePath: string;
  pattern: string;
}

/**
 * Converts Next.js bracket segment syntax into Froot route syntax:
 *   [slug] -> :slug
 *   [...catchAll] -> *
 *   [[...optional]] -> :optional?
 */
export function formatRouteSegment(segment: string): string {
  // Ignore Next.js route groups e.g. (marketing), (auth)
  if (segment.startsWith('(') && segment.endsWith(')')) {
    return '';
  }

  // Optional catch-all: [[...param]]
  if (segment.startsWith('[[...') && segment.endsWith(']]')) {
    const param = segment.slice(5, -2);
    return `:${param}?`;
  }

  // Catch-all: [...param]
  if (segment.startsWith('[...') && segment.endsWith(']')) {
    return '*';
  }

  // Dynamic parameter: [param]
  if (segment.startsWith('[') && segment.endsWith(']')) {
    const param = segment.slice(1, -1);
    return `:${param}`;
  }

  return segment;
}

/**
 * Extracts route group segment name (e.g. '(marketing)') from a relative path if present.
 */
export function extractRouteGroup(relPath: string): string | undefined {
  const normalized = relPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg.startsWith('(') && seg.endsWith(')')) {
      return seg;
    }
  }
  return undefined;
}

/**
 * Parses a relative file path into an AppRouter route pattern.
 */
export function parseRoutePattern(relPath: string): { type: 'layout' | 'page' | 'api' | 'ignored'; pattern: string } {
  const normalized = relPath.replace(/\\/g, '/');
  const ext = path.posix.extname(normalized);
  const baseName = path.posix.basename(normalized, ext);

  // Ignore test files, declaration files, and non-script files
  if (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.endsWith('.d.ts') ||
    !['.tsx', '.jsx', '.ts', '.js'].includes(ext)
  ) {
    return { type: 'ignored', pattern: '' };
  }

  const dirName = path.posix.dirname(normalized);
  const segments = dirName === '.' ? [] : dirName.split('/').filter(Boolean);
  const formattedSegments = segments.map(formatRouteSegment).filter(Boolean);

  // Layout files
  if (baseName === 'layout' || baseName === '_layout') {
    const pattern = formattedSegments.length === 0 ? '/' : `/${formattedSegments.join('/')}`;
    return { type: 'layout', pattern };
  }

  // Next.js App Router API Routes: route.ts, route.js
  if (baseName === 'route') {
    const pattern = formattedSegments.length === 0 ? '/' : `/${formattedSegments.join('/')}`;
    return { type: 'api', pattern };
  }

  // App Router Page files: page.tsx
  if (baseName === 'page') {
    const pattern = formattedSegments.length === 0 ? '/' : `/${formattedSegments.join('/')}`;
    return { type: 'page', pattern };
  }

  // Pages Router style: index.tsx, about.tsx, [slug].tsx
  if (baseName === 'index') {
    const pattern = formattedSegments.length === 0 ? '/' : `/${formattedSegments.join('/')}`;
    return { type: 'page', pattern };
  }

  // Custom named file: about.tsx -> /about, [slug].tsx -> /:slug
  const lastSegment = formatRouteSegment(baseName);
  if (lastSegment) {
    formattedSegments.push(lastSegment);
  }
  const pattern = formattedSegments.length === 0 ? '/' : `/${formattedSegments.join('/')}`;
  return { type: 'page', pattern };
}

/**
 * Scans a directory and automatically registers all layouts and pages into the AppRouter.
 */
export async function discoverRoutes(
  appDir: string,
  router: AppRouter
): Promise<{ layouts: string[]; pages: string[]; apis: string[] }> {
  const resolvedRoot = path.resolve(appDir);
  const discovered: Array<{
    type: 'layout' | 'page' | 'api';
    pattern: string;
    fullPath: string;
    group?: string | undefined;
  }> = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist, .froot, .next
        if (!['node_modules', '.git', 'dist', '.froot', '.next'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const relPath = path.relative(resolvedRoot, fullPath);
        const { type, pattern } = parseRoutePattern(relPath);
        const group = extractRouteGroup(relPath);
        if (type !== 'ignored') {
          discovered.push({ type, pattern, fullPath, group });
        }
      }
    }
  }

  await walk(resolvedRoot);

  // Register layouts first, sorted by pattern length (root '/' first, then '/docs')
  const layouts = discovered
    .filter((d) => d.type === 'layout')
    .sort((a, b) => a.pattern.length - b.pattern.length);

  async function loadModule(filePath: string): Promise<any> {
    const fileUrl = pathToFileURL(filePath).href;
    try {
      return await import(fileUrl);
    } catch (err: any) {
      if (
        err?.code === 'ERR_UNKNOWN_FILE_EXTENSION' ||
        String(err?.message).includes('Unknown file extension')
      ) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Resolve typescript from target project directory
          let ts: any;
          try {
            const req = createRequire(filePath);
            ts = req('typescript');
          } catch {
            const req = createRequire(path.join(process.cwd(), 'package.json'));
            ts = req('typescript');
          }
          const tsCompiler = ts.default || ts;
          const transpiled = tsCompiler.transpileModule(content, {
            compilerOptions: {
              module: tsCompiler.ModuleKind.ESNext,
              target: tsCompiler.ScriptTarget.ES2024,
              jsx: tsCompiler.JsxEmit.ReactJSX,
              jsxImportSource: 'preact',
            },
          });

          // Find project node_modules directory so imports like preact resolve
          let searchDir = path.dirname(filePath);
          let targetNodeModules = path.join(process.cwd(), 'node_modules');
          while (searchDir !== path.dirname(searchDir)) {
            const candidate = path.join(searchDir, 'node_modules');
            try {
              const stat = await fs.stat(candidate);
              if (stat.isDirectory()) {
                targetNodeModules = candidate;
                break;
              }
            } catch {
              // keep walking up
            }
            searchDir = path.dirname(searchDir);
          }

          const cacheDir = path.join(targetNodeModules, '.cache', 'froot');
          await fs.mkdir(cacheDir, { recursive: true });
          const fileHash = crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 12);
          const baseName = path.basename(filePath, path.extname(filePath));
          const cachedFile = path.join(cacheDir, `${baseName}-${fileHash}.mjs`);
          await fs.writeFile(cachedFile, transpiled.outputText, 'utf8');

          return await import(pathToFileURL(cachedFile).href);
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }

  const registeredLayouts: string[] = [];
  for (const item of layouts) {
    const mod = await loadModule(item.fullPath);
    const layoutFn = mod.default || mod.Layout || mod.layout;
    if (typeof layoutFn === 'function') {
      router.layout(item.pattern, layoutFn, {
        isolate: Boolean(mod.isolate),
        group: item.group || mod.group,
      });
      registeredLayouts.push(item.pattern);
    }
  }

  // Register pages
  const pages = discovered.filter((d) => d.type === 'page');
  const registeredPages: string[] = [];
  for (const item of pages) {
    const mod = await loadModule(item.fullPath);
    const pageFn = mod.default || mod.Page || mod.page;
    if (typeof pageFn === 'function') {
      const pageOptions: PageOptions = {};

      if (item.group || mod.group) {
        pageOptions.group = item.group || mod.group;
      }
      if (mod.isolate) {
        pageOptions.isolate = Boolean(mod.isolate);
      }
      if (mod.metadata) {
        pageOptions.metadata = mod.metadata;
      } else if (typeof mod.generateMetadata === 'function') {
        pageOptions.metadata = mod.generateMetadata;
      }

      if (typeof mod.generateStaticParams === 'function') {
        pageOptions.generateStaticParams = mod.generateStaticParams;
      }

      router.page(item.pattern, pageFn, pageOptions);
      registeredPages.push(item.pattern);
    }
  }

  // Register API routes: route.ts
  const apiRoutes = discovered.filter((d) => d.type === 'api');
  const registeredApis: string[] = [];
  for (const item of apiRoutes) {
    const mod = await loadModule(item.fullPath);
    router.api(item.pattern, mod, item.fullPath);
    registeredApis.push(item.pattern);
  }

  return { layouts: registeredLayouts, pages: registeredPages, apis: registeredApis };
}
