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

/**
 * Safely serializes JavaScript state to a JSON string for client-side hydration.
 * Escapes characters that could cause script injection or premature script termination:
 * - `<` is escaped to `\u003c`
 * - `>` is escaped to `\u003e`
 * - `&` is escaped to `\u0026`
 * - Line separator `\u2028` and paragraph separator `\u2029` are escaped to prevent JS eval syntax errors.
 */
export function serializeState(data: unknown): string {
  if (data === undefined) return 'null';
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Deserializes JSON state safely on either server or client.
 */
export function deserializeState<T = any>(serialized: string): T | null {
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return null;
  }
}

export interface HydrationScriptProps {
  id?: string;
  data: unknown;
}

/**
 * Renders an inline JSON script tag for reliable client-side hydration.
 * Example:
 * <HydrationScript id="__FROOT_DATA__" data={{ user, products }} />
 */
export function HydrationScript({ id = '__FROOT_DATA__', data }: HydrationScriptProps): VNode<any> {
  return h('script', {
    id,
    type: 'application/json',
    dangerouslySetInnerHTML: { __html: serializeState(data) },
  }) as VNode<any>;
}

/**
 * Retrieves and deserializes the server-serialized state in the browser during hydration.
 */
export function getHydrationData<T = any>(id: string = '__FROOT_DATA__'): T | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el || !el.textContent) return null;
  return deserializeState<T>(el.textContent);
}

/**
 * Injects a serialized hydration payload script tag into an HTML document string right before </body>.
 */
export function injectHydrationScript(html: string, data: unknown, id: string = '__FROOT_DATA__'): string {
  if (data === undefined || data === null) return html;
  const scriptTag = `<script id="${id}" type="application/json">${serializeState(data)}</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}\n</body>`);
  }
  if (html.includes('</html>')) {
    return html.replace('</html>', `${scriptTag}\n</html>`);
  }
  return `${html}\n${scriptTag}`;
}

/**
 * Browser-side hydration helper for Preact components.
 * Automatically loads hydration data if none is explicitly provided.
 */
export function hydrateRoot(
  componentOrVNode: any,
  containerOrSelector: Element | string,
  initialProps?: any
): void {
  if (typeof document === 'undefined') return;

  const container = typeof containerOrSelector === 'string'
    ? document.querySelector(containerOrSelector)
    : containerOrSelector;

  if (!container) {
    console.warn(`[frootkit] Hydration container not found:`, containerOrSelector);
    return;
  }

  const props = initialProps !== undefined ? initialProps : getHydrationData();
  const vnode = isValidElement(componentOrVNode)
    ? componentOrVNode
    : h(componentOrVNode, props);

  // Dynamic import or require preact hydrate to prevent server import errors
  try {
    const { hydrate } = (globalThis as any).preact || require('preact');
    hydrate(vnode, container);
  } catch {
    // Fallback if bundled with Preact
    try {
      import('preact').then(({ hydrate }) => {
        hydrate(vnode, container);
      });
    } catch (e) {
      console.error('[frootkit] Failed to hydrate:', e);
    }
  }
}

