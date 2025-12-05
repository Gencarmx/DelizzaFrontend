import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      injectRegister: "auto",

      manifest: {
        name: "dlizza-frontend",
        short_name: "dlizza-frontend",
        description: "dlizza-frontend",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone", // ✅ Cambiado
        orientation: "portrait", // ✅ Agregado
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "dlizza-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "dlizza-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "dlizza-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },

      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "./src/core"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@presentation": path.resolve(__dirname, "./src/presentation"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
});
