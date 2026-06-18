import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 모노레포에서 /study/ 경로 아래로 서비스됩니다.
export default defineConfig({
  base: '/study/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: { exclude: ['@soritok/auth', '@soritok/ads'] },
})
