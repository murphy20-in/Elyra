import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Base path.
 *
 * Defaults to "./" so every emitted asset URL is relative to the page.
 * That makes one build artifact work unchanged at a domain root, at
 * https://user.github.io/any-repo-name/, or opened from a sub-folder —
 * without anyone having to configure the repository name. Override with
 * VITE_BASE only if you need absolute paths for a specific host.
 */
const base = process.env.VITE_BASE || "./";

export default defineConfig({
  base,

  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: false,
    // Keep the shell small: chunks are only worth it once a route is heavy.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },

  plugins: [
    VitePWA({
      registerType: "prompt",
      injectRegister: null, // we register manually so we control update UX
      includeAssets: ["favicon.ico", "robots.txt", "icons/*.png", "icons/*.svg"],

      manifest: {
        name: "Elyra — Pehchaan Layer",
        short_name: "Elyra",
        description:
          "A privacy-first way to connect, explore identity, and build real connections. India-first.",
        // Relative so the manifest travels with whatever path it is served from
        start_url: ".",
        scope: ".",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        theme_color: "#05070c",
        background_color: "#05070c",
        categories: ["social", "lifestyle"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
        // Hash routing means every route resolves to index.html
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // the user decides when to take an update
        runtimeCaching: [
          {
            // Google Fonts stylesheets change rarely; serve fast, refresh behind
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "elyra-google-fonts-stylesheets" },
          },
          {
            // The font files themselves are immutable — cache hard
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "elyra-google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: false, // a SW in dev fights HMR
      },
    }),
  ],

  server: {
    port: 5173,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },
});
