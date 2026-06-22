import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev server proxy – routes /api to local backend during development
  // In production, VITE_API_BASE_URL env var points directly to the Render backend URL
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Increase warning limit for large chunks (SandboxPanel, Map3D etc. are intentionally large)
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'map-vendor';
            if (id.includes('deck.gl') || id.includes('@deck.gl')) return 'deck-vendor';
            if (id.includes('recharts')) return 'chart-vendor';
          }
        }
      }
    }
  }
})
