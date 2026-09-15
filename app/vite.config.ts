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
  build: {
    rollupOptions: {
      output: {
        // Firebase et React changent bien moins souvent que l'app : les
        // isoler garde leur cache valide entre deux déploiements.
        manualChunks(id: string) {
          if (id.includes('/node_modules/')) {
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('/react') || id.includes('scheduler')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
  // Les photos de terrain et les polices vivent à la racine du dépôt,
  // partagées avec la v1 : le serveur de dev doit avoir le droit de les lire.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
