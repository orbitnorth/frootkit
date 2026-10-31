export { createAppRouter, AppRouter, isHtmlDocument, type RegisteredApiRoute } from './router.js';
export { discoverRoutes, formatRouteSegment, parseRoutePattern, extractRouteGroup } from './file-router.js';
export { notFound, isNotFoundError, defaultNotFoundView, NotFoundError } from './not-found.js';
export { defaultErrorView, type ErrorComponentProps } from './error-boundary.js';
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
  LoaderContext,
  LoaderFunction,
  ActionContext,
  ActionFunction,
  NotFoundComponent,
  NotFoundProps,
  RegisteredNotFound,
  ErrorComponent,
  ErrorProps,
  RegisteredErrorBoundary,
  HydrationPayload,
  ApiRouteContext,
  ApiRouteHandler,
  ApiRouteModule,
  StaticExportOptions,
  StaticExportResult,
} from './types.js';
