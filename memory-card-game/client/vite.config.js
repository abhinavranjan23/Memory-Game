import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable source maps for debugging
    sourcemap: false, // Disable in production for better performance

    assestsInclude: ["**/*.{png,wav,mp3}"],

    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom"],
          "router-vendor": ["react-router-dom"],
          "animation-vendor": ["framer-motion", "gsap"],
          "ui-vendor": ["@heroicons/react"],
          "utils-vendor": ["axios", "socket.io-client"],
        },
        // Optimize chunk naming
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },

    // Enable minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },

    // Optimize CSS
    cssCodeSplit: true,

    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },

  // Optimize dependencies
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

  // Server configuration for development
  server: {
    port: 5173,
    host: true,
  },

  // Preview configuration
  preview: {
    port: 4173,
    host: true,
  },
});
