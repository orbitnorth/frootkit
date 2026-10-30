import { renderMarkdown } from '../markdown/markdown.js';

export interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = 'prose' }: MarkdownProps) {
  const html = renderMarkdown(content);
  return (
    <article
      class={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

