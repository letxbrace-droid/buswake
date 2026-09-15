import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sert le dépôt sous /buswake/ ; `./` garde les chemins
// relatifs valides aussi bien en local qu'en production.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,               // le manifest du dépôt fait déjà autorité
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg}'],
        // Les photos de fond pèsent : on les met en cache à l'usage plutôt
        // que de bloquer la première visite dessus.
        runtimeCaching: [{
          urlPattern: /\.(?:jpg|png|webp|avif)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'images', expiration: { maxEntries: 60 } },
        }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
