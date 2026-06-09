import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({

  base:'/',

  plugins:[
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker
      manifest: {
        name: 'UHCR-DOCS',
        short_name: 'UHCR',
        theme_color: '#ffffff',
        icons: [{
            src: './public/image/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './public/image/logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: './public/image/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Recommended for Android adaptive icons
          }]
      }
    })
  ]

})