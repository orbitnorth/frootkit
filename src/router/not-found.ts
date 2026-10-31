/**
 * 404 Not Found Contract for FrootKit.
 * Provides Next.js-style `notFound()` error triggers and accessible fallback views.
 */

import { h, type VNode } from 'preact';

export class NotFoundError extends Error {
  public readonly isNotFound = true;
  public readonly status = 404;

  constructor(message: string = 'Page Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Triggers a 404 Not Found error inside a page, layout, loader, or server action.
 * Caught by the AppRouter to render the custom `not-found.tsx` or built-in 404 template.
 */
export function notFound(): never {
  throw new NotFoundError('NEXT_NOT_FOUND');
}

/**
 * Detects whether an error represents a 404 Not Found trigger.
 */
export function isNotFoundError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof NotFoundError) return true;
  if (typeof err === 'object' && ('isNotFound' in err || (err as any).name === 'NotFoundError')) return true;
  if (err instanceof Error && err.message === 'NEXT_NOT_FOUND') return true;
  return false;
}

/**
 * Built-in fallback 404 view adhering to Anti-AI-Slop design guidelines.
 */
export function defaultNotFoundView(): VNode<any> {
  return h(
    'div',
    { class: 'min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center font-sans' },
    h(
      'div',
      { class: 'max-w-md w-full p-8 rounded-2xl bg-[#0a0f18] border border-[#1a2333] shadow-2xl' },
      h(
        'div',
        { class: 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4' },
        'HTTP 404'
      ),
      h('h1', { class: 'text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight' }, 'Page Not Found'),
      h(
        'p',
        { class: 'text-slate-400 text-sm leading-relaxed mb-6' },
        'The resource you requested could not be found or has been moved to a new route.'
      ),
      h(
        'div',
        { class: 'flex items-center justify-center gap-3' },
        h(
          'a',
          {
            href: '/',
            class: 'px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors',
          },
          '← Return Home'
        )
      )
    )
  );
}
