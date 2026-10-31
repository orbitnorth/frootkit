/**
 * High-performance Preact Server-Side Rendering (SSR) utilities.
 */

import { h, Fragment, isValidElement, type ComponentChild, type VNode } from 'preact';
import { renderToString } from 'preact-render-to-string';

// Universal Preact/React shim: allows standard JSX compilers targeting React to work seamlessly with Preact SSR
if (typeof (globalThis as any).React === 'undefined') {
  (globalThis as any).React = {
    createElement: h,
    Fragment,
  };
}

/**
 * Checks whether a value is a valid Preact VNode element.
 */
export function isPreactElement(val: unknown): val is VNode<any> {
  return isValidElement(val);
}

/**
 * Renders a Preact component or VNode tree into an HTML string.
 * Automatically prepends <!DOCTYPE html> if rendering a root <html> element.
 */
export function renderPreact(vnode: ComponentChild): string {
  if (vnode === null || vnode === undefined || typeof vnode === 'boolean') {
    return '';
  }
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return String(vnode);
  }

  const html = renderToString(vnode as VNode<any>);
  if (!html.startsWith('<!DOCTYPE html>') && !html.startsWith('<!doctype html>')) {
    if (html.startsWith('<html') || html.startsWith('<HTML')) {
      return `<!DOCTYPE html>\n${html}`;
    }
  }
  return html;
}

