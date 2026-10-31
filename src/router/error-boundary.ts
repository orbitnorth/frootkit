/**
 * Error Boundary Contract for FrootKit.
 * Provides error boundary fallback views adhering to Anti-AI-Slop standards.
 */

import { h, type VNode } from 'preact';

export interface ErrorComponentProps {
  error: Error;
  reset?: () => void;
}

/**
 * Built-in fallback 500 error view adhering to Anti-AI-Slop design guidelines.
 */
export function defaultErrorView({ error, reset }: ErrorComponentProps): VNode<any> {
  const isDev = process.env.NODE_ENV !== 'production';

  return h(
    'div',
    { class: 'min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center font-sans' },
    h(
      'div',
      { class: 'max-w-lg w-full p-8 rounded-2xl bg-[#0a0f18] border border-[#1a2333] shadow-2xl text-left' },
      h(
        'div',
        { class: 'flex items-center justify-between mb-4' },
        h(
          'span',
          { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-semibold' },
          'HTTP 500 • Application Error'
        )
      ),
      h('h1', { class: 'text-2xl font-bold text-white mb-2 tracking-tight' }, 'Something went wrong'),
      h(
        'p',
        { class: 'text-slate-400 text-sm leading-relaxed mb-6' },
        'An unhandled exception occurred during server-side execution.'
      ),
      isDev && error?.message && h(
        'div',
        { class: 'mb-6 p-4 rounded-lg bg-[#06090f] border border-[#1a2333] overflow-x-auto text-left' },
        h('div', { class: 'text-xs font-mono font-semibold text-rose-400 mb-1' }, String(error.message)),
        error.stack && h(
          'pre',
          { class: 'text-[11px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed' },
          error.stack
        )
      ),
      h(
        'div',
        { class: 'flex items-center gap-3 pt-2' },
        h(
          'a',
          {
            href: '/',
            class: 'px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors',
          },
          '← Return Home'
        ),
        reset && h(
          'button',
          {
            type: 'button',
            onClick: reset,
            class: 'px-4 py-2 rounded-lg bg-[#0f1624] border border-[#1a2333] text-slate-300 font-semibold text-xs hover:text-white transition-colors',
          },
          'Try Again'
        )
      )
    )
  );
}
