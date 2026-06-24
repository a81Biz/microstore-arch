export function GET() {
  const baseUrl = import.meta.env.PUBLIC_STOREFRONT_URL || 'https://tienda.com';
  
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
