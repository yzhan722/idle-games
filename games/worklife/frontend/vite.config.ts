import { defineConfig, type Rollup } from 'vite'
import react from '@vitejs/plugin-react'

const webPort = Number(process.env.WORKLIFE_WEB_PORT || 3000)
const apiTarget = process.env.WORKLIFE_API_TARGET || 'http://localhost:3001'

/** 静态引用到这个模块的有谁：首屏入口、主界面、进阶面板（后两个是动态入口，再往上是按需加载的包装）。 */
function reachedFrom(id: string, getModuleInfo: Rollup.GetModuleInfo) {
  const from = { first: false, game: false, panel: false }
  const seen = new Set([id])
  const queue = [id]
  for (let i = 0; i < queue.length; i++) {
    const file = queue[i].replace(/\\/g, '/')
    if (file.endsWith('/src/main.tsx')) from.first = true
    if (file.endsWith('/components/NewGameInterface.tsx')) from.game = true
    if (/\/components\/advancement\/\w+Panel\.tsx$/.test(file)) from.panel = true
    for (const up of getModuleInfo(queue[i])?.importers ?? []) {
      if (seen.has(up)) continue
      seen.add(up)
      queue.push(up)
    }
  }
  return from
}

/**
 * 面板与主界面共用、首屏又用不到的模块单独成块 game-shared。
 * 主界面的块取不到时会换地址重试（utils/lazyImport.ts）；面板要是从主界面的块里取共用模块，
 * 重试之后就会再下一份原地址的主界面，共用模块变成两份，或者一直取不到。
 */
function manualChunk(id: string, getModuleInfo: Rollup.GetModuleInfo): string | undefined {
  const file = id.replace(/\\/g, '/')
  if (/\/node_modules\/(react|react-dom|scheduler)\//.test(file)) return 'react-vendor'
  if (!file.includes('/frontend/src/') || /\.css($|\?)/.test(file) || file.endsWith('/components/NewGameInterface.tsx')) return undefined
  const shared = (from: ReturnType<typeof reachedFrom>) => from.game && from.panel
  const from = reachedFrom(id, getModuleInfo)
  if (!shared(from)) return undefined
  if (!from.first) return 'game-shared'
  // 首屏也用到、又被 game-shared 引用的小模块跟着 react-vendor 走，免得首屏把整个 game-shared 拉下来
  const pulled = (getModuleInfo(id)?.importers ?? []).some((up) => {
    const above = reachedFrom(up, getModuleInfo)
    return shared(above) && !above.first && !/\/components\/(advancement\/\w+Panel|NewGameInterface)\.tsx$/.test(up.replace(/\\/g, '/'))
  })
  return pulled ? 'react-vendor' : undefined
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 提高单 chunk 体积告警阈值，并把第三方依赖拆出 vendor，避免主包过大
    chunkSizeWarningLimit: 700,
    // 列表小图有几百张、不少在 4 KB 上下：内联会全进首屏 JS，一律单独请求
    assetsInlineLimit: (file) => (/[\\/]assets[\\/]t1_small[\\/]/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks: (id, { getModuleInfo }) => manualChunk(id, getModuleInfo)
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