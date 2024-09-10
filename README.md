# Astro Service Worker

An Astro integration that adds service worker functionality to your Astro project, powered by Workbox.

## Installation

```sh
npm install zastro-service-worker
```

In theory, you can run

```sh
npx astro add zastro-service-worker
```

## Usage

Add the integration to your `astro.config.mjs` file:

```javascript
import { defineConfig } from 'astro/config';
import astroServiceWorker from 'zastro-service-worker';

export default defineConfig({
  integrations: [astroServiceWorker()],
});
```

## Configuration

You can customize the service worker behavior by passing options to the integration:

```javascript
astroServiceWorker({
  userOptions: {
    enableInDevelopment: true, // Enable service worker in development mode
  },
  workboxOptions: {
    // Add custom Workbox options here
  }
})
```

### User Options

- `enableInDevelopment`: Boolean (default: false) - Enables the service worker in development mode.
- `customServiceWorker`: String (not implemented yet) - Path to a custom service worker file.

### Workbox Options

You can pass any valid Workbox options to customize the service worker generation. See the [Workbox documentation](https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-build#.generateSW) for available options.

## Features

- Automatic service worker registration
- Precaching of static assets
- Runtime caching strategies for different types of requests
- Background sync for POST requests
- Customizable caching strategies

## Development

By default, a noop service worker is used in development to prevent caching issues. You can enable the full service worker in development by setting `enableInDevelopment: true` in the user options.

## License

MIT

## Changelog

- 0.0.2: Fix README lol
- 0.0.1: Publish
