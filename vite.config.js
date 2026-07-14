import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    outDir: 'build'
  },
  // Mirror the production nginx routing (see procon-react/nginx.conf) so the
  // SAME relative env values (/api, /manager/api) work in local dev without an
  // nginx in front. hexudon-service = :8001, team-manager = :8000.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/docs': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/redoc': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/openapi.json': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/manager': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/manager/, ''), // /manager/api/x -> /api/x
      },
    },
  },
})
