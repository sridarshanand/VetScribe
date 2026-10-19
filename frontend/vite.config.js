import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Any request to /api/... is forwarded to Django, so the browser never needs the API key.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
  },
});
