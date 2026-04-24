import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:4000',
          changeOrigin: true
        },
        '/health': {
          target: env.VITE_API_BASE_URL || 'http://localhost:4000',
          changeOrigin: true
        },
        '/metrics': {
          target: env.VITE_API_BASE_URL || 'http://localhost:4000',
          changeOrigin: true
        }
      }
    }
  }
})