import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages serves the site from https://<user>.github.io/<repo>/
// Override with VITE_BASE_PATH=/ when hosting at a domain root.
const BASE_PATH = process.env.VITE_BASE_PATH || "/diwali2026/";

/** GitHub Pages has no SPA rewrite rule; serving index.html as 404.html gives deep links a page. */
function spaFallback() {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const dist = resolve(import.meta.dirname, "dist");
      if (existsSync(resolve(dist, "index.html"))) {
        copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? BASE_PATH : "/",
  plugins: [react(), tailwindcss(), spaFallback()],
  server: { port: 5173, host: true },
  build: { target: "es2020", sourcemap: false },
}));
