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