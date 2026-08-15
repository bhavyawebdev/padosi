import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // REST API -> FastAPI (avoids CORS in dev)
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // WebSocket live feed -> FastAPI
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
