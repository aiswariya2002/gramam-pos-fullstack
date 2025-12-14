// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "assets/logo.png",
        "assets/upi.png",
        "assets/beep.mp3",
        "assets/icon.png"
      ],

      manifest: {
        id: "/",
        name: "Gramam POS",
        short_name: "GramamPOS",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2b7a0b",
        description: "Offline-ready POS Billing System.",
        icons: [
          {
            src: "assets/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "assets/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "assets/maskable-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },

      workbox: {
        // ✅ allow up to 5 MB bundles for caching (fixes your build error)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        globPatterns: ["**/*.{js,css,html,png,svg,ico,json,webmanifest,mp3}"],
        globIgnores: ["**/node_modules/**/*"],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/(?!api).*/],
        ignoreURLParametersMatching: [/__WB_REVISION__/],
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          // Static assets
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "public-assets",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 31536000 }
            }
          },

          // Images and icons
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|ico|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "app-icons",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 31536000 }
            }
          },

          // Uploaded product images
          {
            urlPattern: ({ url }) =>
              url.origin === "http://localhost:5000" &&
              url.pathname.startsWith("/uploads"),
            handler: "CacheFirst",
            options: {
              cacheName: "uploaded-product-images",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 31536000 }
            }
          },

          // Product API cache
          {
            urlPattern: ({ url }) =>
              url.origin === "http://localhost:5000" &&
              url.pathname.startsWith("/api/product"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "products-cache",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 }
            }
          },

          // Billing API – real-time only, with background sync
          {
            urlPattern: ({ url }) =>
              url.origin === "http://localhost:5000" &&
              url.pathname.startsWith("/api/bill"),
            handler: "NetworkOnly",
            options: {
              backgroundSync: {
                name: "posTransactionQueue",
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          },

          // Router navigation (Dashboard, Sales, etc.)
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      devOptions: {
        enabled: false
      }
    })
  ],

  build: {
    // ✅ fix chunk warning + improve performance
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          mui: ["@mui/material", "@mui/icons-material"],
          utils: ["./src/utils/apiBase.js", "./src/utils/offlineDB.js"]
        }
      }
    }
  },

  server: {
    open: false,
    host: true
  }
});
