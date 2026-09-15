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
    // Le manifeste dit QUELS chunks l'entrée importe statiquement. Sans lui,
    // le budget de poids se calcule au nom de fichier — et un filtre sur
    // « Matchs » ne reconnaît ni DetailMatch ni TerminerMatch, donc des
    // chunks chargés à la demande étaient comptés dans la première peinture.
    manifest: true,
    rollupOptions: {
      output: {
        // Firebase et React changent bien moins souvent que l'app : les
        // isoler garde leur cache valide entre deux déploiements.
        // On regroupe sur des FRONTIÈRES DE PAQUET, pas sur un bout de nom.
        // `id.includes('/react')` attrapait aussi @tanstack/react-query,
        // react-hook-form et motion/react : tous se retrouvaient dans le
        // chunk de première peinture alors qu'ils ne servent qu'à des écrans
        // chargés à la demande. Mesuré : 147 Ko au lieu de 136.
        manualChunks(id: string) {
          const m = id.match(/\/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
          if (!m) return undefined;
          const paquet = m[1];
          if (paquet === 'firebase' || paquet.startsWith('@firebase')) return 'firebase';
          if (['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'].includes(paquet)) {
            return 'react';
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
