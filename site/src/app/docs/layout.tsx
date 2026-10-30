/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import { DocsLayout } from '../../components/DocsLayout.js';

export interface DocsNestedLayoutProps {
  currentPath?: string | undefined;
  children: ComponentChildren;
}

export default function DocsNestedLayout({ currentPath, children }: DocsNestedLayoutProps) {
  // Nested layout inside RootLayout - pure UI embedding without duplicate <html><head><body>
  return <DocsLayout currentPath={currentPath}>{children}</DocsLayout>;
}

