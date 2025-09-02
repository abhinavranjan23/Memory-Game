export default function handler(req, res) {
  // Set proper headers for XML
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Home Page - Highest Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Game Page - High Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/game</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Dashboard Page - High Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/dashboard</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Lobby Page - High Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/lobby</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Leaderboard Page - Medium-High Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/leaderboard</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Profile Page - Medium Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/profile</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Login Page - Medium Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/login</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Register Page - Medium Priority -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/register</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Admin Dashboard - Lower Priority (Protected) -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/admin</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- Waiting Area - Lower Priority (Game State) -->
  <url>
    <loc>https://memory-game-pink-six.vercel.app/waiting</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

</urlset>`;

  res.status(200).send(sitemap);
}
