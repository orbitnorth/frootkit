import type { ComponentChildren } from 'preact';

export interface LinkProps {
  href: string;
  class?: string;
  className?: string;
  children?: ComponentChildren;
  [key: string]: any;
}

export function Link({ href, children, class: cls, className, ...rest }: LinkProps) {
  return (
    <a href={href} class={cls || className} {...rest}>
      {children}
    </a>
  );
}
