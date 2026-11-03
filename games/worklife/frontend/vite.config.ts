import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const webPort = Number(process.env.WORKLIFE_WEB_PORT || 3000)
const apiTarget = process.env.WORKLIFE_API_TARGET || 'http://localhost:3001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 提高单 chunk 体积告警阈值，并把第三方依赖拆出 vendor，避免主包过大
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: webPort,
    host: '0.0.0.0', // 监听所有网络接口
    strictPort: false,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: apiTarget.replace(/^http/, 'ws'),
        ws: true
      }
    },
    hmr: {
      // 只在localhost使用WebSocket HMR
      // 通过ngrok访问时会自动降级为polling
      overlay: false // 禁用错误覆盖层，避免HMR错误导致页面不可用
    }
  }
})