import type { AstroIntegration, AstroConfig } from "astro";
import path from "node:path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { generateSW, type GenerateSWOptions } from "workbox-build";

const SW_NAME = "service-worker.js";

interface UserOptions {
  customServiceWorker?: string;
}

export default function astroServiceWorker(
  userOptions: UserOptions = {},
  workboxOptions: Partial<GenerateSWOptions> = {}
): AstroIntegration {
  let config: AstroConfig;

  const mergedUserOptions: UserOptions = {
    ...userOptions,
  };

  const defaultWorkboxConfig: Partial<GenerateSWOptions> = {
    swDest: SW_NAME,
    clientsClaim: true,
    skipWaiting: true,
    sourcemap: false,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) =>
          request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "worker",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
        },
      },
      {
        urlPattern: ({ request }) => request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
        handler: "CacheFirst",
        options: {
          cacheName: "asset-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: ({ request }) => request.method === "POST",
        handler: "NetworkOnly",
        options: {
          backgroundSync: {
            name: "astro-sync-queue",
            options: {
              maxRetentionTime: 24 * 60 * 60, // 24 hours
            },
          },
        },
      },
    ],
  };

  const mergedWorkboxConfig: Partial<GenerateSWOptions> = {
    ...defaultWorkboxConfig,
    ...workboxOptions,
  };

  return {
    name: "astro-service-worker",
    hooks: {
      "astro:config:setup": async ({ config: cfg, injectScript, command }) => {
        config = cfg;
        const swPath = path.join(config.base, SW_NAME);
        const isDev = command === "dev";

        injectScript(
          "head-inline",
          `\
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('${swPath}').then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    }).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}
          `
        );

        if (isDev) {
          const publicDir = fileURLToPath(config.publicDir);
          const swDest = path.join(publicDir, SW_NAME);
          const noopServiceWorkerContent = `
            // This is a noop service worker for development
            self.addEventListener('install', () => self.skipWaiting());
            self.addEventListener('activate', () => self.clients.claim());
          `;
          await fs.mkdir(path.dirname(swDest), { recursive: true });
          await fs.writeFile(swDest, noopServiceWorkerContent, "utf-8");
          console.log("Created noop service worker for development");
        }
      },
      "astro:build:done": async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const swDest = path.join(outDir, SW_NAME);

        // Remove any existing service worker file
        try {
          await fs.unlink(swDest);
        } catch (error) {
          // Ignore if file doesn't exist
        }

        try {
          if (mergedUserOptions.customServiceWorker) {
            // Handle custom service worker logic here
            console.log("Custom service worker not yet implemented");
          } else {
            const result = await generateSW({
              ...mergedWorkboxConfig,
              swDest,
              globDirectory: outDir,
            });
            console.log("Generated service worker successfully:", result);
          }
        } catch (error) {
          console.error("Error generating service worker:", error);
        }
      },
    },
  };
}
