import type { ComponentChild, VNode } from 'preact';
import type { Context } from 'frootjs';

export interface Metadata {
  title?: string;
  description?: string;
  keywords?: string[];
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
    type?: string;
  };
}

export interface PageProps<TParams = Record<string, string>> {
  params: TParams;
  searchParams: Record<string, string | string[]>;
  c: Context;
}

export interface LayoutProps<TParams = Record<string, string>> {
  children: ComponentChild;
  params: TParams;
  currentPath: string;
  metadata?: Metadata | undefined;
}

export interface LayoutOptions {
  isolate?: boolean;
  group?: string | undefined;
}

export type PageComponent<TParams = Record<string, string>> = (
  props: PageProps<TParams>
) => Promise<ComponentChild | string | VNode<any>> | ComponentChild | string | VNode<any>;

export type LayoutComponent<TParams = Record<string, string>> = (
  props: LayoutProps<TParams>
) => Promise<ComponentChild | string | VNode<any>> | ComponentChild | string | VNode<any>;

export interface PageOptions {
  metadata?: Metadata | ((props: PageProps) => Promise<Metadata> | Metadata) | undefined;
  generateStaticParams?: () => Promise<Array<Record<string, string>>> | Array<Record<string, string>>;
  isolate?: boolean;
  group?: string | undefined;
}

export interface ApiRouteContext<TParams = Record<string, string>> {
  params: TParams;
}

export type ApiRouteHandler<TParams = Record<string, string>> = (
  request: Request,
  context: ApiRouteContext<TParams>,
  c: Context
) => Promise<Response | object | string | void> | Response | object | string | void;

export interface ApiRouteModule {
  GET?: ApiRouteHandler;
  POST?: ApiRouteHandler;
  PUT?: ApiRouteHandler;
  DELETE?: ApiRouteHandler;
  PATCH?: ApiRouteHandler;
  OPTIONS?: ApiRouteHandler;
  HEAD?: ApiRouteHandler;
  [key: string]: any;
}

export interface StaticExportOptions {
  outDir: string;
  copyAssets?: Array<{ from: string; to?: string }>;
}

export interface StaticExportResult {
  outDir: string;
  renderedRoutes: string[];
  filesWritten: string[];
  durationMs: number;
}
