import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/UHCR-DOCS/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "UHCR-DOCS",
        short_name: "UHCR",
        start_url: "/UHCR-DOCS/",
        scope: "/UHCR-DOCS/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "image/logo192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "image/logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "image/logo192.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
