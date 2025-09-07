import { copyFileSync, existsSync } from "fs";
import { join } from "path";

const staticFiles = [
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "cardGames.png",
  "site.webmanifest",
];

console.log("📁 Copying static files to dist folder...");

staticFiles.forEach((file) => {
  const srcPath = join(process.cwd(), "public", file);
  const destPath = join(process.cwd(), "dist", file);

  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${file} to dist folder`);
  } else {
    console.warn(`⚠️  ${file} not found in public folder`);
  }
});

console.log("🎉 Static files copy completed!");
