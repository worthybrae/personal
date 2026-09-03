import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { SITE, allRoutes } from './src/lib/seo'

/**
 * Emits dist/seo-routes.json so the FastAPI server can inject per-route
 * <title>/description/Open Graph tags into index.html without duplicating the
 * project and art data in Python. See backend/seo.py.
 */
function seoManifest(): Plugin {
  return {
    name: 'seo-manifest',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'seo-routes.json',
        source: JSON.stringify({ site: SITE, routes: allRoutes() }, null, 2),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), seoManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5176,
    strictPort: false,
    allowedHosts: [
      '.railway.app',
      'worthyrae.com',
      'www.worthyrae.com'
    ],
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production'
          ? 'http://127.0.0.1:8080'  // Railway
          : `http://127.0.0.1:${process.env.VITE_BACKEND_PORT || 8001}`, // Local
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      clientPort: 443
    }
  },
})