import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  // Serve static assets (manifest, favicons, service worker, offline page)
  // from the project-level `public` directory during dev
  publicDir: '../public',
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
});


