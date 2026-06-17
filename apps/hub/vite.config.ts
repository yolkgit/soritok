import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 허브는 도메인 루트(/)에서 서비스됩니다.
// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  // 워크스페이스 소스 패키지(@soritok/auth)는 prebundle 하지 않고 소스로 컴파일
  optimizeDeps: { exclude: ['@soritok/auth'] },
})
