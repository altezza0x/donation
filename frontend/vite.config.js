import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['tslib', '@rainbow-me/rainbowkit']
  },
  server: {
    host: true, // expose ke jaringan lokal (HP)
    proxy: {
      // Semua request /api/* akan diteruskan ke backend Express
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
})
