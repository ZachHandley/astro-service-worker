import { defineConfig } from "astro/config";
import astroServiceWorker from "./package/index.ts";

// https://astro.build/config
export default defineConfig({
  integrations: [
    astroServiceWorker({
      userOptions: {
        enableInDevelopment: true,
      },
    }),
  ],
  vite: {
    test: {
      globals: true,
      environment: "node",
    },
  },
});
