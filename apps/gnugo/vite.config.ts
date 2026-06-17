import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 모노레포에서 /gnugo/ 경로 아래로 서비스됩니다.
    base: '/gnugo/',
    plugins: [react(), tailwindcss()],
    // 워크스페이스 소스 패키지(@soritok/auth)는 prebundle 하지 않고 소스로 컴파일
    optimizeDeps: { exclude: ['@soritok/auth'] },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
