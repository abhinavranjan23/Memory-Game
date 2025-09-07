import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,

    assestsInclude: ["**/*.{png,wav,mp3}"],

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
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
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
