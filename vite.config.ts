import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Le nom du dépôt GitHub : l'appli sera servie sur https://<pseudo>.github.io/pokedex/
const base = '/pokedex/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Pokédex – mon classeur',
        short_name: 'Pokédex',
        description: 'Scanne tes cartes Pokémon, range-les dans tes classeurs et suis la cote de ta collection.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#16224a',
        theme_color: '#16224a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Images des cartes (TCGdex)
            urlPattern: ({ url }) => url.hostname === 'assets.tcgdex.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-images',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Données des cartes et cotes
            urlPattern: ({ url }) => url.hostname === 'api.tcgdex.net',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tcgdex-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Moteur de reconnaissance de texte (chargé au premier scan)
            urlPattern: ({ url }) =>
              url.hostname === 'cdn.jsdelivr.net' && /tesseract|tessdata/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-engine',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
