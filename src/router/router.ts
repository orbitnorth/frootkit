/**
 * Next.js-style App Router for Froot and Preact.
 * Provides nested layouts, dynamic routes with params, file-based routing, and Static Site Generation (SSG).
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { HTTPException, type Froot, type Context } from 'frootjs';
import { isPreactElement, renderPreact } from '../preact/render.js';
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
  private tailwindOptions?: TailwindOptions | undefined;
  private tailwindStop?: (() => void) | undefined;

  constructor(app: Froot) {
    this.app = app;
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
   * Default route is '/styles.css'.
   */
  public serveCss(filePath: string, routePath: string = '/styles.css'): this {
    const resolvedPath = path.resolve(filePath);
    this.cssAssets.push({ filePath: resolvedPath, routePath });

    this.app.get(routePath, async (c) => {
      try {
        const content = await fs.readFile(resolvedPath, 'utf8');
        c.header('Content-Type', 'text/css; charset=utf-8');
        c.header('Cache-Control', 'public, max-age=3600');
        return c.text(content);
      } catch {
        return c.text(`/* CSS file not found at ${resolvedPath} */`, 404);
      }
    });

    return this;
  }

  /**
   * Automatically discovers and registers file-based routes (layouts, pages, and API routes) from the specified directory.
   */
  public async discover(appDir: string): Promise<{ layouts: string[]; pages: string[]; apis: string[] }> {
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

            const rawReq = (c.req as any).raw || new Request(c.req.url, {
              method: c.req.method,
              headers: (c.req as any).raw?.headers || (c.req as any).headers || {},
            });

            const result = await handler(rawReq, { params }, c);

            if (result instanceof Response) {
              return result;
            }
            if (typeof result === 'object' && result !== null) {
              return c.json(result);
            }
            if (typeof result === 'string') {
              return c.text(result);
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

        (this.app as any)[methodLower](normalizedPattern, dispatch);
        if (normalizedPattern !== '/') {
          (this.app as any)[methodLower](`${normalizedPattern}/`, dispatch);
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
      this.app.get(routePath, async (c) => {
        // 1. Resolve path params & searchParams
        const params: Record<string, string> = {};
        const routeParams = (c.req as any).params || (c.req as any)._params || {};
        if (typeof routeParams === 'object' && routeParams !== null) {
          for (const [k, v] of Object.entries(routeParams)) {
            params[k] = String(v ?? '');
          }
        }

        const rawQuery = c.req.query();
        const searchParams = (typeof rawQuery === 'object' && rawQuery !== null ? rawQuery : {}) as Record<
          string,
          string | string[]
        >;

        // 2. Resolve metadata
        let metadata: Metadata | undefined;
        if (options?.metadata) {
          if (typeof options.metadata === 'function') {
            metadata = await options.metadata({ params, searchParams, c });
          } else {
            metadata = options.metadata;
          }
        }

        // 3. Render page content
        const pageNode = await pageFn({ params, searchParams, c });

        // 4. Wrap with matching layouts from innermost to outermost (root)
        const currentPath = c.req.path;
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

        // 5. Render to HTML
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

        return c.html(html);
      });
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
