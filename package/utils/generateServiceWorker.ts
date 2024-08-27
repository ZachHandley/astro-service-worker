import type { AstroConfig } from "astro";
import type { ServiceWorkerOptions } from "../index.js";

export async function generateServiceWorker(
  _: AstroConfig,
  options: ServiceWorkerOptions,
  routes: { pathname: string }[]
): Promise<string> {
  const {
    cacheStaticAssetsDuration = 24 * 60 * 60,
    apiCachePatterns = [],
    precacheFiles = [],
    backgroundSync,
    cachingStrategies = {},
    runtimeCaching = [],
    cacheNamePrefix = "astro",
    cacheStaticAssetsExtensions = [],
  } = options;

  const routesToPrecache = routes
    .map((route) => route.pathname)
    .filter((pathname) => !pathname.includes("service-worker"));
  const allPrecacheFiles = [
    ...new Set([...precacheFiles, ...routesToPrecache]),
  ];

  const swContent = `
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

    workbox.setConfig({
      debug: false
    });

    self.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    });

    workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

    workbox.precaching.precacheAndRoute(${JSON.stringify(
      allPrecacheFiles
    )}.map(url => ({
      url,
      revision: null
    })));

    workbox.routing.registerRoute(
      ({ request }) => ${JSON.stringify(
        cacheStaticAssetsExtensions
      )}.some(ext => request.url.endsWith(ext)),
      new workbox.strategies.CacheFirst({
        cacheName: '${cacheNamePrefix}-static-assets',
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxAgeSeconds: ${cacheStaticAssetsDuration},
          }),
        ],
      })
    );

    ${apiCachePatterns
      .map(
        (pattern) => `
    workbox.routing.registerRoute(
      new RegExp('^${pattern}'),
      new workbox.strategies.NetworkFirst({
        cacheName: '${cacheNamePrefix}-api',
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 5 * 60,
          }),
        ],
      })
    );
    `
      )
      .join("\n")}

    ${Object.entries(cachingStrategies)
      .map(
        ([pattern, strategy]) => `
    workbox.routing.registerRoute(
      new RegExp('${pattern}'),
      new workbox.strategies.${strategy}({
        cacheName: '${cacheNamePrefix}-${pattern}',
      })
    );
    `
      )
      .join("\n")}

    ${runtimeCaching
      .map(
        ({ urlPattern, handler, options }) => `
    workbox.routing.registerRoute(
      ${
        typeof urlPattern === "function"
          ? urlPattern.toString()
          : `new RegExp('${urlPattern}')`
      },
      new workbox.strategies.${handler}({
        cacheName: '${options?.cacheName || `${cacheNamePrefix}-runtime`}',
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: ${options?.expiration?.maxEntries || 50},
            maxAgeSeconds: ${
              options?.expiration?.maxAgeSeconds || 24 * 60 * 60
            },
          }),
        ],
      })
    );
    `
      )
      .join("\n")}

    ${
      backgroundSync
        ? `
    const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('${backgroundSync.name}', {
      maxRetentionTime: ${backgroundSync.options.maxRetentionTime} * 60
    });

    workbox.routing.registerRoute(
      ({request}) => request.method === 'POST',
      new workbox.strategies.NetworkOnly({
        plugins: [bgSyncPlugin]
      })
    );
    `
        : ""
    }
  `;

  return swContent;
}
