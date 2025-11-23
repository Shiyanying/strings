import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Docker 环境使用服务名 backend，本地开发使用 localhost
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
