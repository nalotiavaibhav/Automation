import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { DOCS_BASE_URL } from '@/lib/docs/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const docsPages = source.getPages().map((page) => ({
    url: `${DOCS_BASE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${DOCS_BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...docsPages,
  ];
}
