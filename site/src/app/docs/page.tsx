/** @jsxImportSource preact */
import { getDoc } from 'frootkit';
import { DocsPage } from '../../components/DocsPage.js';
import { getAdjacentDocs } from '../../data/docs-nav.js';

export async function generateMetadata() {
  return {
    title: 'Overview — FrootKit Documentation',
    description: 'Learn why FrootKit is the lightweight, hyper-fast alternative to Next.js.',
  };
}

export default async function DocsOverviewPage() {
  const { frontmatter, html, headings } = await getDoc('overview');
  const { next } = getAdjacentDocs('overview');

  return (
    <DocsPage
      title={frontmatter['title'] || 'Introduction'}
      category={frontmatter['category'] || 'Getting Started'}
      summary={frontmatter['summary'] || frontmatter['description'] || ''}
      markdownHtml={html}
      headings={headings}
      next={next}
    />
  );
}

