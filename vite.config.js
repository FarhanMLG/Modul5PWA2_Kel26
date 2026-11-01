import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Bore & Barrel',
        short_name: 'Bore & Barrel',
        description: 'A small armory — pistols, rifles, and shotguns.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f4f5',
        theme_color: '#f2f4f5',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Only precache the critical app shell so dynamic components lazy-load on demand in Network tab
        globPatterns: [
          '**/*.{css,html,svg,png,webmanifest}',
          '**/index-*.js',
          'registerSW.js',
        ],
        globIgnores: [
          '**/CreateGunPage*.js',
          '**/EditGunPage*.js',
          '**/EditProfilePage*.js',
          '**/GunDetail*.js',
          '**/ProfilePage*.js',
          '**/FavoritesPage*.js',
        ],
      },
    }),
  ],
})
