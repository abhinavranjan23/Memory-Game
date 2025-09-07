import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-static-files",
      writeBundle() {
        const staticFiles = [
          "sitemap.xml",
          "robots.txt",
          "favicon.ico",
          "cardGames.png",
          "site.webmanifest",
        ];

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
      },
    },
  ],
  publicDir: "public",
  build: {
    sourcemap: false,

    assetsInclude: ["**/*.{png,wav,mp3,xml,txt,ico,webmanifest}"],

    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "router-vendor": ["react-router-dom"],
          "animation-vendor": ["framer-motion", "gsap"],
          "ui-vendor": ["@heroicons/react"],
          "utils-vendor": ["axios", "socket.io-client"],
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          // Keep static files in root directory
          if (
            assetInfo.name &&
            [
              "sitemap.xml",
              "robots.txt",
              "favicon.ico",
              "cardGames.png",
              "site.webmanifest",
            ].includes(assetInfo.name)
          ) {
            return "[name].[ext]";
          }
          return "assets/[ext]/[name]-[hash].[ext]";
        },
      },
    },

    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    // Optimize CSS
    cssCodeSplit: true,

    chunkSizeWarningLimit: 1000,
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "gsap",
      "@heroicons/react/24/outline",
      "axios",
      "socket.io-client",
    ],
  },

  server: {
    port: 5173,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },
});
