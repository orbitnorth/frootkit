/** @jsxImportSource preact */
import { getDoc } from 'frootkit';
import { DocsPage } from '../../../components/DocsPage.js';
import { ALL_DOC_ITEMS, getAdjacentDocs } from '../../../data/docs-nav.js';

export async function generateStaticParams() {
  return ALL_DOC_ITEMS
    .filter((item) => item.id !== 'overview')
    .map((item) => ({ slug: item.id }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = params.slug || 'quickstart';
  const item = ALL_DOC_ITEMS.find((d) => d.id === slug);
  const title = item ? `${item.title} — FrootKit Docs` : 'FrootKit Documentation';
  return { title };
}

export default async function DocSlugPage({ params }: { params: { slug: string } }) {
  const slug = params.slug || 'quickstart';
  const { frontmatter, html, headings } = await getDoc(slug);
  const { prev, next } = getAdjacentDocs(slug);

  return (
    <DocsPage
      title={frontmatter['title'] || slug}
      category={frontmatter['category'] || 'Documentation'}
      summary={frontmatter['summary'] || frontmatter['description'] || ''}
      markdownHtml={html}
      headings={headings}
      prev={prev}
      next={next}
    />
  );
}

