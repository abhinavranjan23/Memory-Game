import { copyFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const staticFiles = [
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "cardGames.png",
  "site.webmanifest",
];

console.log("📁 Copying static files to dist folder...");
console.log("Current working directory:", process.cwd());

// Check if public directory exists
const publicDir = join(process.cwd(), "public");
if (existsSync(publicDir)) {
  console.log("Public directory contents:", readdirSync(publicDir));
} else {
  console.log("Public directory not found at:", publicDir);
}

// Check if dist directory exists
const distDir = join(process.cwd(), "dist");
if (existsSync(distDir)) {
  console.log("Dist directory exists");
} else {
  console.log("Dist directory not found at:", distDir);
}

// Try multiple possible source locations
const possibleSourceDirs = [
  join(process.cwd(), "public"),
  join(process.cwd(), "src", "public"),
  join(process.cwd(), "..", "public"),
  process.cwd(),
];

staticFiles.forEach((file) => {
  let srcPath = null;
  let foundIn = null;

  // Try to find the file in different locations
  for (const dir of possibleSourceDirs) {
    const testPath = join(dir, file);
    if (existsSync(testPath)) {
      srcPath = testPath;
      foundIn = dir;
      break;
    }
  }

  const destPath = join(process.cwd(), "dist", file);

  if (srcPath) {
    copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${file} from ${foundIn} to dist folder`);
  } else {
    console.warn(`⚠️  ${file} not found in any of the expected locations`);
    console.warn(`   Searched in: ${possibleSourceDirs.join(", ")}`);
  }
});

console.log("🎉 Static files copy completed!");
