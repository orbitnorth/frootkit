/**
 * Next.js-style App Router for Froot and Preact.
 * Provides nested layouts, dynamic routes with params, file-based routing, and Static Site Generation (SSG).
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { HTTPException, type Froot, type Context } from 'frootjs';
import { isPreactElement, renderPreact, injectHydrationScript } from '../preact/render.js';
import { isNotFoundError, defaultNotFoundView } from './not-found.js';
import { defaultErrorView } from './error-boundary.js';
import { discoverRoutes } from './file-router.js';
import {
  compileTailwind,
  watchTailwind,
  resolveTailwindPaths,
  type TailwindOptions,
  type TailwindInstance,
} from './tailwind.js';
import type {
  Metadata,
  PageComponent,
  LayoutComponent,
  LayoutOptions,
  PageOptions,
  ApiRouteModule,
  StaticExportOptions,
  StaticExportResult,
  NotFoundComponent,
  ErrorComponent,
  RegisteredNotFound,
  RegisteredErrorBoundary,
} from './types.js';

/**
 * Detects whether a rendered node or string already constitutes a complete root HTML document.
 */
export function isHtmlDocument(node: unknown): boolean {
  if (node === null || node === undefined) return false;
  if (typeof node === 'string') {
    const trimmed = node.trimStart();
    return (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML')
    );
  }
  if (isPreactElement(node)) {
    return node.type === 'html' || node.type === 'HTML';
  }
  if (typeof node === 'object' && node !== null && 'tag' in node) {
    const tag = (node as any).tag;
    return tag === 'html' || tag === 'HTML';
  }
  return false;
}

interface RegisteredPage {
  pattern: string;
  pageFn: PageComponent;
  options?: PageOptions | undefined;
}

interface RegisteredLayout {
  prefix: string;
  layoutFn: LayoutComponent;
  options?: LayoutOptions | undefined;
}

interface RegisteredCssAsset {
  filePath: string;
  routePath: string;
}

export interface RegisteredApiRoute {
  pattern: string;
  methods: string[];
  filePath?: string | undefined;
  routeModule: ApiRouteModule;
}

export class AppRouter {
  private readonly app: Froot;
  private readonly pages: RegisteredPage[] = [];
  private readonly layouts: RegisteredLayout[] = [];
  private readonly cssAssets: RegisteredCssAsset[] = [];
  private readonly apiRoutes: RegisteredApiRoute[] = [];
  private readonly notFounds: RegisteredNotFound[] = [];
  private readonly errorBoundaries: RegisteredErrorBoundary[] = [];
  private tailwindOptions?: TailwindOptions | undefined;
  private tailwindStop?: (() => void) | undefined;

  constructor(app: Froot) {
    this.app = app;

    // Attach default 404 handler for unmatched routes
    if (typeof (this.app as any).notFound === 'function') {
      (this.app as any).notFound(async (c: Context) => {
        return this.renderNotFound(c);
      });
    }
  }

  /**
   * Registers a Not Found (404) component for a specific route prefix or globally ('/').
   * Supports Next.js-style directory-scoped `not-found.tsx` rendering inside matching parent layouts.
   */
  public notFound(
    prefixOrFn: string | NotFoundComponent,
    fn?: NotFoundComponent,
    options?: { group?: string | undefined; filePath?: string | undefined }
  ): this {
    if (typeof prefixOrFn === 'function') {
      this.notFounds.push({
        prefix: '/',
        notFoundFn: prefixOrFn,
        options,
        filePath: options?.filePath,
      });
    } else {
      const cleanPrefix =
        prefixOrFn.endsWith('/') && prefixOrFn !== '/' ? prefixOrFn.slice(0, -1) : prefixOrFn;
      if (fn) {
        this.notFounds.push({
          prefix: cleanPrefix,
          notFoundFn: fn,
          options,
          filePath: options?.filePath,
        });
      }
    }
    return this;
  }

  /**
   * Backward-compatible alias for setting the root Not Found 404 component.
   */
  public setNotFound(fn: NotFoundComponent): this {
    return this.notFound('/', fn);
  }

  /**
   * Resolves the closest matching `not-found.tsx` for a given path, matching directory hierarchies
   * and route groups like in Next.js App Router.
   */
  public getMatchingNotFound(
    currentPath: string,
    options?: { group?: string | undefined }
  ): RegisteredNotFound | null {
    const cleanPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;
    const targetGroup = options?.group;

    const matches: RegisteredNotFound[] = [];
    for (const nf of this.notFounds) {
      if (nf.options?.group && nf.options.group !== targetGroup) {
        continue;
      }

      if (nf.prefix === '/') {
        matches.push(nf);
        continue;
      }

      if (cleanPath === nf.prefix || cleanPath.startsWith(`${nf.prefix}/`)) {
        matches.push(nf);
        continue;
      }

      if (nf.prefix.includes(':')) {
        const regexStr = '^' + nf.prefix.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '(/.*)?$';
        if (new RegExp(regexStr).test(cleanPath)) {
          matches.push(nf);
          continue;
        }
      }
    }

    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      const segsA = a.prefix === '/' ? 0 : a.prefix.split('/').filter(Boolean).length;
      const segsB = b.prefix === '/' ? 0 : b.prefix.split('/').filter(Boolean).length;
      if (segsB !== segsA) return segsB - segsA;
      return b.prefix.length - a.prefix.length;
    });

    return matches[0] || null;
  }

  /**
   * Registers an Error Boundary (500) component for a specific route prefix or globally ('/').
   * Supports Next.js-style directory-scoped `error.tsx` rendering inside matching parent layouts.
   */
  public errorBoundary(
    prefixOrFn: string | ErrorComponent,
    fn?: ErrorComponent,
    options?: { group?: string | undefined; filePath?: string | undefined }
  ): this {
    if (typeof prefixOrFn === 'function') {
      this.errorBoundaries.push({
        prefix: '/',
        errorFn: prefixOrFn,
        options,
        filePath: options?.filePath,
      });
    } else {
      const cleanPrefix =
        prefixOrFn.endsWith('/') && prefixOrFn !== '/' ? prefixOrFn.slice(0, -1) : prefixOrFn;
      if (fn) {
        this.errorBoundaries.push({
          prefix: cleanPrefix,
          errorFn: fn,
          options,
          filePath: options?.filePath,
        });
      }
    }
    return this;
  }

  /**
   * Backward-compatible alias for setting the root Error Boundary 500 component.
   */
  public setErrorBoundary(fn: ErrorComponent): this {
    return this.errorBoundary('/', fn);
  }

  /**
   * Resolves the closest matching `error.tsx` for a given path, matching directory hierarchies
   * and route groups like in Next.js App Router.
   */
  public getMatchingErrorBoundary(
    currentPath: string,
    options?: { group?: string | undefined }
  ): RegisteredErrorBoundary | null {
    const cleanPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;
    const targetGroup = options?.group;

    const matches: RegisteredErrorBoundary[] = [];
    for (const eb of this.errorBoundaries) {
      if (eb.options?.group && eb.options.group !== targetGroup) {
        continue;
      }

      if (eb.prefix === '/') {
        matches.push(eb);
        continue;
      }

      if (cleanPath === eb.prefix || cleanPath.startsWith(`${eb.prefix}/`)) {
        matches.push(eb);
        continue;
      }

      if (eb.prefix.includes(':')) {
        const regexStr = '^' + eb.prefix.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '(/.*)?$';
        if (new RegExp(regexStr).test(cleanPath)) {
          matches.push(eb);
          continue;
        }
      }
    }

    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      const segsA = a.prefix === '/' ? 0 : a.prefix.split('/').filter(Boolean).length;
      const segsB = b.prefix === '/' ? 0 : b.prefix.split('/').filter(Boolean).length;
      if (segsB !== segsA) return segsB - segsA;
      return b.prefix.length - a.prefix.length;
    });

    return matches[0] || null;
  }

  /**
   * Pre-renders and returns the 404 HTML string for a path wrapped inside all matching parent layouts.
   */
  public async renderNotFoundHtml(
    currentPath: string = '/',
    options?: { group?: string | undefined; params?: Record<string, string> }
  ): Promise<string> {
    const params = options?.params || {};
    const matchedNf = this.getMatchingNotFound(currentPath, options);

    const notFoundNode = matchedNf
      ? await matchedNf.notFoundFn({ currentPath, params })
      : defaultNotFoundView();

    const matchingLayouts = this.getMatchingLayouts(currentPath, options);
    let finalTree = notFoundNode;
    for (let i = matchingLayouts.length - 1; i >= 0; i--) {
      const matchedLayout = matchingLayouts[i];
      if (!matchedLayout) continue;
      if (isHtmlDocument(finalTree)) break;

      finalTree = await matchedLayout.layoutFn({
        children: finalTree,
        params,
        currentPath,
        metadata: { title: '404: Not Found' },
      });
    }

    return typeof finalTree === 'string' ? finalTree : renderPreact(finalTree as any);
  }

  /**
   * Renders 404 Not Found response wrapped in all matching parent layouts.
   */
  public async renderNotFound(
    c: Context,
    options?: { group?: string | undefined; params?: Record<string, string> }
  ): Promise<Response> {
    const currentPath = c.req.path;
    const html = await this.renderNotFoundHtml(currentPath, options);
    c.status(404);
    return c.html(html);
  }

  /**
   * Pre-renders and returns the 500 HTML string for an error wrapped inside all matching parent layouts.
   */
  public async renderErrorHtml(
    err: any,
    currentPath: string = '/',
    options?: { group?: string | undefined; params?: Record<string, string> }
  ): Promise<string> {
    const params = options?.params || {};
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const matchedErr = this.getMatchingErrorBoundary(currentPath, options);

    const errorNode = matchedErr
      ? await matchedErr.errorFn({ error: errorObj, currentPath, params })
      : defaultErrorView({ error: errorObj });

    const matchingLayouts = this.getMatchingLayouts(currentPath, options);
    let finalTree = errorNode;
    for (let i = matchingLayouts.length - 1; i >= 0; i--) {
      const matchedLayout = matchingLayouts[i];
      if (!matchedLayout) continue;
      if (isHtmlDocument(finalTree)) break;

      finalTree = await matchedLayout.layoutFn({
        children: finalTree,
        params,
        currentPath,
        metadata: { title: '500: Server Error' },
      });
    }

    return typeof finalTree === 'string' ? finalTree : renderPreact(finalTree as any);
  }

  /**
   * Renders 500 Application Error response wrapped in all matching parent layouts.
   */
  public async renderError(
    err: any,
    c: Context,
    options?: { group?: string | undefined; params?: Record<string, string> }
  ): Promise<Response> {
    const currentPath = c.req.path;
    const html = await this.renderErrorHtml(err, currentPath, options);
    c.status(500);
    return c.html(html);
  }

  /**
   * Enables built-in Tailwind CSS v4 support.
   * - Automatically resolves and compiles Tailwind v4 input CSS with @theme tokens
   * - In development, runs background compilation and hot-reloading watcher
   * - Automatically serves compiled CSS at `routePath` (default `/styles.css`)
   * - Seamlessly integrates with Static Site Generation (SSG) in `exportStatic()`
   */
  public async enableTailwind(options: TailwindOptions = {}): Promise<TailwindInstance> {
    const { input, output, routePath, cwd } = await resolveTailwindPaths(options);
    this.tailwindOptions = { ...options, input, output, routePath, cwd };

    // 1. Compile initial CSS
    await compileTailwind(this.tailwindOptions);

    // 2. Register CSS route
    this.serveCss(output, routePath);

    // 3. Spawns watcher if development
    const shouldWatch =
      options.watch ?? (process.env['NODE_ENV'] !== 'production' && !process.env['FROOT_BUILD']);

    let stopWatcher = () => {};
    if (shouldWatch) {
      const watcher = watchTailwind(this.tailwindOptions);
      stopWatcher = watcher.stop;
      this.tailwindStop = stopWatcher;
    }

    return {
      input,
      output,
      routePath,
      stopWatcher,
    };
  }

  /**
   * Stops the background Tailwind CSS watcher process if active.
   */
  public stopTailwind(): void {
    if (this.tailwindStop) {
      this.tailwindStop();
      this.tailwindStop = undefined;
    }
  }

  /**
   * Registers a nested layout for all routes matching a path prefix.
   * Example:
   * router.layout('/docs', ({ children, currentPath }) => <DocsLayout currentPath={currentPath}>{children}</DocsLayout>)
   */
  public layout(prefix: string, layoutFn: LayoutComponent, options?: LayoutOptions): this {
    const cleanPrefix = prefix.endsWith('/') && prefix !== '/' ? prefix.slice(0, -1) : prefix;
    this.layouts.push({ prefix: cleanPrefix, layoutFn, options });
    return this;
  }

  /**
   * Discovers matching layouts for currentPath ordered from root (prefix '/') to innermost nested layout.
   * If any layout sets `isolate: true`, ancestor layouts above it are excluded.
   * If route groups or isolation options are provided, only matching layouts are selected.
   */
  public getMatchingLayouts(
    currentPath: string,
    options?: { group?: string | undefined; isolate?: boolean | undefined } | undefined
  ): RegisteredLayout[] {
    const cleanPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;

    // Sort by prefix length ascending: '/' comes first, then '/docs', etc.
    const sorted = [...this.layouts].sort((a, b) => a.prefix.length - b.prefix.length);
    const matched: RegisteredLayout[] = [];

    const targetGroup = options?.group;

    for (const layout of sorted) {
      // If layout belongs to a specific group, only include it if target matches
      if (layout.options?.group && layout.options.group !== targetGroup) {
        continue;
      }

      const isMatch =
        layout.prefix === '/' ||
        cleanPath === layout.prefix ||
        cleanPath.startsWith(`${layout.prefix}/`);

      if (isMatch) {
        if (layout.options?.isolate || options?.isolate) {
          // Isolate removes ancestor wrappers
          matched.length = 0;
        }
        matched.push(layout);
      }
    }

    return matched;
  }

  /**
   * Serves a compiled CSS file (e.g. Tailwind v4 dist/styles.css) at a route.
   * Default route is '/styles.css'. Supports both GET and HEAD requests.
   */
  public serveCss(filePath: string, routePath: string = '/styles.css'): this {
    const resolvedPath = path.resolve(filePath);
    this.cssAssets.push({ filePath: resolvedPath, routePath });

    const handler = async (c: Context) => {
      try {
        const content = await fs.readFile(resolvedPath, 'utf8');
        const headers = {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': String(Buffer.byteLength(content, 'utf8')),
        };
        if (c.req.method === 'HEAD') {
          return new Response(null, { status: 200, headers });
        }
        c.header('Content-Type', headers['Content-Type']);
        c.header('Cache-Control', headers['Cache-Control']);
        c.header('Content-Length', headers['Content-Length']);
        return c.text(content);
      } catch {
        return c.text(`/* CSS file not found at ${resolvedPath} */`, 404);
      }
    };

    this.app.get(routePath, handler);
    if (typeof (this.app as any).on === 'function') {
      this.app.on('HEAD', routePath, handler);
    }

    return this;
  }

  /**
   * Serves static assets from a local directory (e.g. Next.js standard public/ directory).
   * Supports both GET and HEAD methods, MIME types, If-Modified-Since HTTP 304 caching,
   * and path traversal defense.
   */
  public serveStatic(options: { root: string; prefix?: string }): this {
    const rootDir = path.resolve(options.root);
    const prefix = options.prefix || '';

    this.app.use(async (c: Context, next: () => Promise<Response | undefined | void>) => {
      if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
        return next();
      }

      const pathname = c.req.path;
      if (prefix && !pathname.startsWith(prefix)) {
        return next();
      }

      const relativePath = prefix ? pathname.slice(prefix.length) : pathname;
      const safeRelPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(rootDir, safeRelPath);

      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
          return next();
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.mjs': 'text/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.avif': 'image/avif',
          '.ico': 'image/x-icon',
          '.txt': 'text/plain; charset=utf-8',
          '.xml': 'application/xml; charset=utf-8',
          '.pdf': 'application/pdf',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.wasm': 'application/wasm',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const headers: Record<string, string> = {
          'Content-Type': contentType,
          'Content-Length': String(stat.size),
          'Last-Modified': stat.mtime.toUTCString(),
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
        };

        const ifModifiedSince = c.req.header('if-modified-since');
        if (ifModifiedSince) {
          const clientTime = new Date(ifModifiedSince).getTime();
          if (stat.mtime.getTime() <= clientTime) {
            return new Response(null, { status: 304, headers });
          }
        }

        if (c.req.method === 'HEAD') {
          return new Response(null, { status: 200, headers });
        }

        const fileBuffer = await fs.readFile(filePath);
        return new Response(fileBuffer, { status: 200, headers });
      } catch {
        return next();
      }
    });

    return this;
  }

  /**
   * Automatically discovers and registers file-based routes (layouts, pages, and API routes) from the specified directory.
   */
  public async discover(appDir: string): Promise<{
    layouts: string[];
    pages: string[];
    apis: string[];
    notFounds?: string[];
    errors?: string[];
  }> {
    return discoverRoutes(appDir, this);
  }

  /**
   * Registers a Next.js-style API route with exported HTTP method handlers.
   * Runs natively on top of Froot router.
   * Example:
   * router.api('/api/users', {
   *   GET: async (req, { params }) => Response.json({ users: [] }),
   *   POST: async (req, { params }) => Response.json({ created: true }, { status: 201 }),
   * });
   */
  public api(pattern: string, routeModule: ApiRouteModule, filePath?: string): this {
    const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;
    const implementedMethods: string[] = [];

    const normalizedPattern = pattern.endsWith('/') && pattern.length > 1
      ? pattern.slice(0, -1)
      : pattern;

    for (const method of HTTP_METHODS) {
      const handler = routeModule[method];
      if (typeof handler === 'function') {
        implementedMethods.push(method);
        const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

        const dispatch = async (c: Context) => {
          try {
            const params: Record<string, string> = {};
            const routeParams = (c.req as any).params || (c.req as any)._params || {};
            if (typeof routeParams === 'object' && routeParams !== null) {
              for (const [k, v] of Object.entries(routeParams)) {
                params[k] = String(v ?? '');
              }
            }

            const baseReq = (c.req as any).raw || new Request(c.req.url, {
              method: c.req.method,
              headers: (c.req as any).raw?.headers || (c.req as any).headers || {},
            });

            const rawReq = new Proxy(baseReq, {
              get(target, prop, receiver) {
                if (prop === 'json') return () => (c.req as any).json();
                if (prop === 'text') return () => (c.req as any).text();
                if (prop === 'formData') return () => (c.req as any).formData();
                if (prop === 'arrayBuffer') return () => (c.req as any).arrayBuffer();
                const val = Reflect.get(target, prop, receiver);
                return typeof val === 'function' ? val.bind(target) : val;
              },
            });

            const result = await handler(rawReq as any, { params }, c);

            if (result instanceof Response) {
              return result;
            }
            if (typeof result === 'object' && result !== null) {
              return c.json(result);
            }
            if (typeof result === 'string') {
              return c.text(result);
            }
            if (result === undefined || result === null) {
              return new Response(null, { status: 204 });
            }
            return result;
          } catch (err: any) {
            if (err instanceof HTTPException) {
              return c.json({ error: err.message }, err.status);
            }
            console.error(`API Route Error [${method} ${normalizedPattern}]:`, err);
            return c.json({ error: 'Internal Server Error', message: String(err?.message || err) }, 500);
          }
        };

        if (typeof (this.app as any)[methodLower] === 'function') {
          (this.app as any)[methodLower](normalizedPattern, dispatch);
          if (normalizedPattern !== '/') {
            (this.app as any)[methodLower](`${normalizedPattern}/`, dispatch);
          }
        } else if (typeof (this.app as any).on === 'function') {
          (this.app as any).on(method.toUpperCase(), normalizedPattern, dispatch);
          if (normalizedPattern !== '/') {
            (this.app as any).on(method.toUpperCase(), `${normalizedPattern}/`, dispatch);
          }
        }
      }
    }

    if (implementedMethods.length > 0) {
      this.apiRoutes.push({
        pattern: normalizedPattern,
        methods: implementedMethods,
        filePath,
        routeModule,
      });
    }

    return this;
  }

  /**
   * Returns list of all registered Next.js-style API routes.
   */
  public getApiRoutes(): ReadonlyArray<RegisteredApiRoute> {
    return this.apiRoutes;
  }

  /**
   * Registers a page route with optional dynamic parameters and metadata.
   * Example:
   * router.page('/docs/:slug?', async ({ params }) => <DocsPage slug={params.slug} />)
   */
  public page(pattern: string, pageFn: PageComponent, options?: PageOptions): this {
    this.pages.push({ pattern, pageFn, options });

    const registerHandler = (routePath: string) => {
      const pageHandler = async (c: Context) => {
        const params: Record<string, string> = {};
        try {
          const currentPath = c.req.path;

          // 1. Resolve path params & searchParams
          const routeParams = (c.req as any).params || (c.req as any)._params || {};
          if (typeof routeParams === 'object' && routeParams !== null) {
            for (const [k, v] of Object.entries(routeParams)) {
              params[k] = String(v ?? '');
            }
          }

          // Catch-all wildcard parameter extraction: /docs/* -> params.slug or params.wildcard
          if (pattern.includes('*')) {
            const prefix = pattern.split('*')[0] || '';
            if (prefix && currentPath.startsWith(prefix)) {
              const wildcardVal = currentPath.slice(prefix.length);
              if (!params.wildcard) params.wildcard = wildcardVal;
              if (pattern.includes('slug') && !params.slug) params.slug = wildcardVal;
            }
          }

          const rawQuery = c.req.query();
          const searchParams = (typeof rawQuery === 'object' && rawQuery !== null ? rawQuery : {}) as Record<
            string,
            string | string[]
          >;

          const rawReq = (c.req as any).raw || new Request(c.req.url, {
            method: c.req.method,
            headers: (c.req as any).raw?.headers || (c.req as any).headers || {},
          });

          // 2. Data Loader execution (Server function data loading)
          let loaderData: any = undefined;
          if (typeof options?.loader === 'function') {
            loaderData = await options.loader({ params, searchParams, request: rawReq, c });
          }

          // 3. Resolve metadata
          let metadata: Metadata | undefined;
          if (options?.metadata) {
            if (typeof options.metadata === 'function') {
              metadata = await options.metadata({ params, searchParams, c, data: loaderData });
            } else {
              metadata = options.metadata;
            }
          }

          // 4. Render page content
          const pageNode = await pageFn({ params, searchParams, c, data: loaderData });

          // 5. Wrap with matching layouts from innermost to outermost (root)
          const matchingLayouts = this.getMatchingLayouts(currentPath, options);

          let finalTree = pageNode;
          for (let i = matchingLayouts.length - 1; i >= 0; i--) {
            const matchedLayout = matchingLayouts[i];
            if (!matchedLayout) continue;

            // If an inner layout or page already produced a full HTML document (e.g. <html>...</html>),
            // outer layouts must not re-wrap it into another <html>!
            if (isHtmlDocument(finalTree)) {
              break;
            }

            finalTree = await matchedLayout.layoutFn({
              children: finalTree,
              params,
              currentPath,
              ...(metadata !== undefined ? { metadata } : {}),
            });
          }

          // 6. Render to HTML
          let html: string;
          if (typeof finalTree === 'string') {
            html = finalTree;
          } else if (isPreactElement(finalTree)) {
            html = renderPreact(finalTree);
          } else if (typeof finalTree === 'object' && finalTree !== null && 'tag' in finalTree) {
            // Fallback if Froot internal JSX was returned
            const { renderToHtml } = await import('frootjs/jsx');
            html = await renderToHtml(finalTree as any);
          } else {
            html = renderPreact(finalTree as any);
          }

          // 7. Inject Hydration Payload if loaderData exists
          if (loaderData !== undefined) {
            html = injectHydrationScript(html, {
              data: loaderData,
              params,
              currentPath,
              ...(metadata ? { metadata } : {}),
            });
          }

          if (c.req.method === 'HEAD') {
            return new Response(null, {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Length': String(Buffer.byteLength(html, 'utf-8')),
              },
            });
          }

          return c.html(html);
        } catch (err: any) {
          if (isNotFoundError(err)) {
            return this.renderNotFound(c, { group: options?.group, params });
          }
          return this.renderError(err, c, { group: options?.group, params });
        }
      };

      this.app.get(routePath, pageHandler);
      if (typeof (this.app as any).on === 'function') {
        this.app.on('HEAD', routePath, pageHandler);
      }
    };

    if (pattern.includes(':') && pattern.includes('?')) {
      // e.g. /docs/:slug? -> register /docs and /docs/:slug
      const basePattern = pattern.replace(/\/:[a-zA-Z0-9_]+\?$/, '') || '/';
      const requiredPattern = pattern.replace('?', '');
      registerHandler(basePattern);
      registerHandler(requiredPattern);
    } else {
      registerHandler(pattern);
    }

    // Register Server Action POST handler if defined on page
    if (typeof options?.action === 'function') {
      const registerAction = (routePath: string) => {
        this.app.post(routePath, async (c) => {
          const params: Record<string, string> = {};
          try {
            const routeParams = (c.req as any).params || (c.req as any)._params || {};
            if (typeof routeParams === 'object' && routeParams !== null) {
              for (const [k, v] of Object.entries(routeParams)) {
                params[k] = String(v ?? '');
              }
            }

            const rawReq = (c.req as any).raw || new Request(c.req.url, {
              method: c.req.method,
              headers: (c.req as any).raw?.headers || (c.req as any).headers || {},
              body: (c.req as any).raw?.body,
            });

            const actionResult = await options.action!({ request: rawReq, params, c });

            if (actionResult instanceof Response) {
              return actionResult;
            }
            if (typeof actionResult === 'object' && actionResult !== null) {
              return c.json(actionResult);
            }
            if (typeof actionResult === 'string') {
              return c.text(actionResult);
            }
            return actionResult;
          } catch (err: any) {
            if (isNotFoundError(err)) {
              return this.renderNotFound(c, { group: options?.group, params });
            }
            return this.renderError(err, c, { group: options?.group, params });
          }
        });
      };

      if (pattern.includes(':') && pattern.includes('?')) {
        const basePattern = pattern.replace(/\/:[a-zA-Z0-9_]+\?$/, '') || '/';
        const requiredPattern = pattern.replace('?', '');
        registerAction(basePattern);
        registerAction(requiredPattern);
      } else {
        registerAction(pattern);
      }
    }

    return this;
  }

  /**
   * Static Site Generation (SSG):
   * Prerenders all registered static pages and dynamic routes (via generateStaticParams)
   * into production-ready static HTML files.
   */
  public async exportStatic(options: StaticExportOptions): Promise<StaticExportResult> {
    const startTime = performance.now();
    const { outDir, copyAssets = [] } = options;

    await fs.mkdir(outDir, { recursive: true });

    const routesToRender = new Set<string>();

    for (const p of this.pages) {
      if (p.pattern.includes(':')) {
        if (p.options?.generateStaticParams) {
          const paramList = await p.options.generateStaticParams();
          for (const paramObj of paramList) {
            let renderedPath = p.pattern;
            for (const [key, val] of Object.entries(paramObj)) {
              renderedPath = renderedPath.replace(new RegExp(`:${key}\\??`), val ? String(val) : '');
            }
            renderedPath = renderedPath.replace(/\/+/g, '/');
            if (renderedPath.endsWith('/') && renderedPath !== '/') {
              renderedPath = renderedPath.slice(0, -1);
            }
            routesToRender.add(renderedPath);
          }
        }
      } else {
        routesToRender.add(p.pattern);
      }
    }

    const filesWritten: string[] = [];
    const renderedRoutes: string[] = [];

    for (const route of routesToRender) {
      const cleanRoute = route.startsWith('/') ? route : `/${route}`;
      const req = new Request(`http://localhost${cleanRoute}`);
      const res = await this.app.fetch(req);

      if (res.status !== 200) {
        const errText = await res.text();
        throw new Error(`SSG export failed for route "${cleanRoute}": HTTP ${res.status}\n${errText}`);
      }

      const body = await res.text();

      let relativeFilePath: string;
      if (cleanRoute === '/' || cleanRoute === '') {
        relativeFilePath = 'index.html';
      } else {
        relativeFilePath = path.join(cleanRoute.slice(1), 'index.html');
        // Flat HTML e.g. docs.html
        const flatPath = path.join(outDir, `${cleanRoute.slice(1)}.html`);
        await fs.mkdir(path.dirname(flatPath), { recursive: true });
        await fs.writeFile(flatPath, body, 'utf8');
        filesWritten.push(flatPath);
      }

      const targetPath = path.join(outDir, relativeFilePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, body, 'utf8');

      filesWritten.push(targetPath);
      renderedRoutes.push(cleanRoute);
    }

    // Compile production minified Tailwind CSS if enabled
    if (this.tailwindOptions) {
      try {
        const compiledCss = await compileTailwind({
          ...this.tailwindOptions,
          minify: true,
        });
        const rel = this.tailwindOptions.routePath?.replace(/^\//, '') || 'styles.css';
        const dest = path.join(outDir, rel);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, compiledCss, 'utf8');
        filesWritten.push(dest);
      } catch {
        // fallback
      }
    }

    // Copy registered CSS assets
    for (const css of this.cssAssets) {
      try {
        const rel = css.routePath.startsWith('/') ? css.routePath.slice(1) : css.routePath;
        const dest = path.join(outDir, rel);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(css.filePath, dest);
        filesWritten.push(dest);
      } catch {
        // Continue if CSS file was not generated
      }
    }

    // Copy additional static assets
    for (const asset of copyAssets) {
      try {
        const src = path.resolve(asset.from);
        const dest = path.join(outDir, asset.to || path.basename(asset.from));
        const stat = await fs.stat(src);
        if (stat.isDirectory()) {
          await fs.cp(src, dest, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(src, dest);
        }
      } catch {
        // ignore missing optional assets
      }
    }

    // Pre-render 404 Not Found pages into .froot/404.html and nested route dirs
    try {
      const root404Html = await this.renderNotFoundHtml('/');
      const root404Path = path.join(outDir, '404.html');
      await fs.writeFile(root404Path, root404Html, 'utf8');
      filesWritten.push(root404Path);

      // Pre-render nested 404 pages (e.g. dashboard/404.html)
      for (const nf of this.notFounds) {
        if (nf.prefix !== '/') {
          const nestedHtml = await this.renderNotFoundHtml(nf.prefix, { group: nf.options?.group });
          const nestedSubdir = nf.prefix.replace(/^\//, '');
          const nested404Path = path.join(outDir, nestedSubdir, '404.html');
          await fs.mkdir(path.dirname(nested404Path), { recursive: true });
          await fs.writeFile(nested404Path, nestedHtml, 'utf8');
          filesWritten.push(nested404Path);
        }
      }
    } catch {
      // Continue if not-found pre-rendering encounters non-critical warnings
    }

    // Write routes manifest
    const manifest = {
      version: 1,
      pages: renderedRoutes,
      apiRoutes: this.apiRoutes.map((r) => ({
        pattern: r.pattern,
        methods: r.methods,
      })),
    };
    const manifestPath = path.join(outDir, 'routes-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    filesWritten.push(manifestPath);

    const durationMs = Math.round(performance.now() - startTime);
    return {
      outDir,
      renderedRoutes,
      filesWritten,
      durationMs,
    };
  }
}

/**
 * Creates an AppRouter instance attached to a Froot application.
 */
export function createAppRouter(app: Froot): AppRouter {
  return new AppRouter(app);
}
