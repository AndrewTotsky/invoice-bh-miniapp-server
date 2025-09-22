import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/invoice-bh-miniapp-server/',
  server: {
    proxy: {
      '/api': {
        target: 'http://45.82.153.105:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})