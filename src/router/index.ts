export { createAppRouter, AppRouter, isHtmlDocument, type RegisteredApiRoute } from './router.js';
export { discoverRoutes, formatRouteSegment, parseRoutePattern, extractRouteGroup } from './file-router.js';
export {
  compileTailwind,
  watchTailwind,
  resolveTailwindBinary,
  resolveTailwindPaths,
  type TailwindOptions,
  type TailwindInstance,
} from './tailwind.js';
export type {
  Metadata,
  PageProps,
  LayoutProps,
  LayoutOptions,
  PageComponent,
  LayoutComponent,
  PageOptions,
  ApiRouteContext,
  ApiRouteHandler,
  ApiRouteModule,
  StaticExportOptions,
  StaticExportResult,
} from './types.js';
