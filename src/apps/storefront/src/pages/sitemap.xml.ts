import { getAllProductSlugs } from '../lib/catalog/catalog';

export async function GET() {
  const slugs = await getAllProductSlugs();
  const baseUrl = import.meta.env.PUBLIC_STOREFRONT_URL || 'https://tienda.com';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${slugs.map(slug => `
  <url>
    <loc>${baseUrl}/producto/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
