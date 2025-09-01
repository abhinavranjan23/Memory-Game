#!/usr/bin/env node

/**
 * Sitemap Generator for Memory Masters Game
 * Run this script to automatically generate/update sitemap.xml
 * Usage: node scripts/generate-sitemap.js
 */

const fs = require("fs");
const path = require("path");

// Configuration
const BASE_URL = "https://memory-game-pink-six.vercel.app";
const OUTPUT_FILE = path.join(__dirname, "../public/sitemap.xml");
const CURRENT_DATE = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

// Define your site structure with priorities and change frequencies
const SITE_STRUCTURE = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "weekly",
    description: "Home Page - Highest Priority",
  },
  {
    path: "/game",
    priority: "0.9",
    changefreq: "weekly",
    description: "Game Page - High Priority",
  },
  {
    path: "/dashboard",
    priority: "0.8",
    changefreq: "weekly",
    description: "Dashboard Page - High Priority",
  },
  {
    path: "/lobby",
    priority: "0.8",
    changefreq: "weekly",
    description: "Lobby Page - High Priority",
  },
  {
    path: "/leaderboard",
    priority: "0.7",
    changefreq: "daily",
    description: "Leaderboard Page - Medium-High Priority",
  },
  {
    path: "/profile",
    priority: "0.6",
    changefreq: "monthly",
    description: "Profile Page - Medium Priority",
  },
  {
    path: "/login",
    priority: "0.5",
    changefreq: "monthly",
    description: "Login Page - Medium Priority",
  },
  {
    path: "/register",
    priority: "0.5",
    changefreq: "monthly",
    description: "Register Page - Medium Priority",
  },
  {
    path: "/admin",
    priority: "0.3",
    changefreq: "monthly",
    description: "Admin Dashboard - Lower Priority (Protected)",
  },
  {
    path: "/waiting",
    priority: "0.4",
    changefreq: "monthly",
    description: "Waiting Area - Lower Priority (Game State)",
  },
];

// Generate sitemap XML content
function generateSitemapXML() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

`;

  SITE_STRUCTURE.forEach((page) => {
    xml += `  <!-- ${page.description} -->
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${CURRENT_DATE}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>

`;
  });

  xml += "</urlset>";
  return xml;
}

// Write sitemap to file
function writeSitemap(xmlContent) {
  try {
    // Ensure the public directory exists
    const publicDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, xmlContent, "utf8");
    console.log(`✅ Sitemap generated successfully at: ${OUTPUT_FILE}`);
    console.log(`📅 Last updated: ${CURRENT_DATE}`);
    console.log(`🔗 Base URL: ${BASE_URL}`);
    console.log(`📊 Total pages: ${SITE_STRUCTURE.length}`);
  } catch (error) {
    console.error("❌ Error generating sitemap:", error.message);
    process.exit(1);
  }
}

// Main execution
function main() {
  console.log("🚀 Generating sitemap for Memory Masters Game...");

  const xmlContent = generateSitemapXML();
  writeSitemap(xmlContent);

  console.log("\n📋 Sitemap includes:");
  SITE_STRUCTURE.forEach((page) => {
    console.log(
      `   • ${page.path} (Priority: ${page.priority}, Update: ${page.changefreq})`
    );
  });

  console.log("\n💡 Next steps:");
  console.log("   1. Deploy the updated sitemap to Vercel");
  console.log("   2. Submit the sitemap URL to Google Search Console");
  console.log("   3. Request re-indexing of your main pages");
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateSitemapXML, SITE_STRUCTURE };
