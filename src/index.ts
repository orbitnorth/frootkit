/**
 * @froot/fullstack - High-performance Next.js alternative for Froot and Preact.
 */

// Next.js-Style Zero-Config App Factory & CLI Engine
export {
  createFrootKit,
  createFrootKitApp,
  createFullstackApp,
  build,
  findProjectRoot,
  resolveAppDir,
  resolveStylesPath,
  resolveDefaultAssets,
  type FrootKitOptions,
  type FrootKitInstance,
  type FullstackAppOptions,
  type FullstackAppInstance,
} from './app.js';

// Router, File-Based Routing & Tailwind CSS v4 Engine
export {
  createAppRouter,
  AppRouter,
  isHtmlDocument,
  discoverRoutes,
  formatRouteSegment,
  parseRoutePattern,
  extractRouteGroup,
  notFound,
  isNotFoundError,
  defaultNotFoundView,
  NotFoundError,
  defaultErrorView,
  compileTailwind,
  watchTailwind,
  resolveTailwindBinary,
  resolveTailwindPaths,
  type RegisteredApiRoute,
  type TailwindOptions,
  type TailwindInstance,
  type Metadata,
  type PageProps,
  type LayoutProps,
  type LayoutOptions,
  type PageComponent,
  type LayoutComponent,
  type PageOptions,
  type LoaderContext,
  type LoaderFunction,
  type ActionContext,
  type ActionFunction,
  type NotFoundComponent,
  type NotFoundProps,
  type RegisteredNotFound,
  type ErrorComponent,
  type ErrorProps,
  type RegisteredErrorBoundary,
  type HydrationPayload,
  type ApiRouteContext,
  type ApiRouteHandler,
  type ApiRouteModule,
  type StaticExportOptions,
  type StaticExportResult,
} from './router/index.js';

// Preact SSR & Reliable Client Hydration
export {
  renderPreact,
  isPreactElement,
  serializeState,
  deserializeState,
  HydrationScript,
  getHydrationData,
  injectHydrationScript,
  hydrateRoot,
  type HydrationScriptProps,
  type ComponentChild,
  type ComponentChildren,
  type ComponentType,
  type VNode,
  type FunctionComponent,
} from './preact/index.js';

// Markdown Engine & Syntax Highlighting
export {
  renderMarkdown,
  renderMarkdownFile,
  parseFrontmatter,
  extractHeadings,
  getDoc,
  renderDoc,
  highlightCode,
  type ParsedMarkdown,
  type MarkdownHeading,
  type GetDocOptions,
} from './markdown/index.js';

// Preact Components
export {
  Link,
  Markdown,
  type LinkProps,
  type MarkdownProps,
} from './components/index.js';

// Process & Port Management
export { getPidOnPort, killProcessOnPort } from './process.js';

// Next.js-Style Import Alias Configuration
export {
  ensureImportAlias,
  stripJsonComments,
  type EnsureAliasOptions,
} from './alias.js';
