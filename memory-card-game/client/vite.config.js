import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "e95fedc38c75.ngrok-free.app", // 👈 your ngrok domain here
    ],
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  },
  assetsInclude: ["**/*.wav", "**/*.mp3"],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Let Vite handle audio files with default asset naming
          // This ensures proper module resolution and caching
          return `assets/[name]-[hash].[ext]`;
        },
      },
    },
  },
  // Ensure public assets are copied correctly
  publicDir: "public",
  // Add base URL for production
  base: "/",
});
