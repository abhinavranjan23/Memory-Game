import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "e95fedc38c75.ngrok-free.app", // 👈 your ngrok domain here
    ],
  },
});
