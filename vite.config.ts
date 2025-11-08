import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: [
      '.railway.app',
      'worthyrae.com',
      'www.worthyrae.com'
    ],
    proxy: {
      '/api': {
        // Railway uses port 8080, local dev uses 8000
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      clientPort: 443
    }
  },
})