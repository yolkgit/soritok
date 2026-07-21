import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { injectBlogPosts } from './build/injectBlogPosts'

// 허브는 도메인 루트(/)에서 서비스됩니다.
// https://vite.dev/config/
export default defineConfig({
  base: '/',
  // injectBlogPosts: 빌드 시 슬로우7 최신 글을 index.html에 정적 HTML로 주입
  // (SPA라 크롤러가 못 읽는 문제 해결 → 루트가 '콘텐츠 있는 사이트'가 됨)
  plugins: [react(), tailwindcss(), injectBlogPosts()],
  // 워크스페이스 소스 패키지는 prebundle 하지 않고 소스로 컴파일
  optimizeDeps: { exclude: ['@soritok/auth', '@soritok/ads'] },
})
