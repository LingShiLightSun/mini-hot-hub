import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 开发环境：将前端发起的 /api 请求转发到本地 Express（localhost:3001）。
      // 这样前端代码只需用相对路径 '/api/hot/weibo'，浏览器不会产生 CORS 跨域问题。
      // 注意：proxy 仅在 `vite dev` 生效；生产环境见下方说明，改用 VITE_API_BASE。
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
