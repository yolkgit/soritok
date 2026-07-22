import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {seoContent} from './build/seoContent';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 모노레포에서 /gnugo/ 경로 아래로 서비스됩니다.
    base: '/gnugo/',
    plugins: [
      react(),
      tailwindcss(),
      // 크롤러용 정적 소개 콘텐츠 (SPA는 JS 전엔 빈 화면이라 필요)
      seoContent({
        heading: '⚫ 어린이 바둑교실 — 놀이처럼 배우는 첫 바둑',
        intro:
          '바둑을 처음 만나는 아이들을 위한 온라인 바둑 교실입니다. 돌 놓기부터 따내기, 집 짓기까지 단계별로 즐겁게 배우고, 컴퓨터와 직접 대국하며 실력을 키워요.',
        sections: [
          {
            title: '바둑의 기본 규칙부터 차근차근',
            body:
              '바둑판 위에 돌을 번갈아 놓는 것부터 시작합니다. 검은 돌이 먼저 두고 흰 돌이 따라 두며, 돌이 놓인 자리를 중심으로 집을 지어 넓은 땅을 차지한 쪽이 이깁니다. 아이 눈높이에 맞춘 설명과 그림으로 처음 접하는 아이도 쉽게 이해할 수 있어요.',
          },
          {
            title: '따내기와 활로 — 돌을 지키는 법',
            body:
              '돌 주변의 빈 자리를 활로라고 합니다. 상대 돌의 활로를 모두 막으면 그 돌을 따낼 수 있어요. 반대로 내 돌이 잡히지 않으려면 활로를 열어두거나 두 눈을 만들어야 합니다. 실제 대국에서 자연스럽게 익힐 수 있도록 단계별 문제를 제공합니다.',
          },
          {
            title: '집 짓기와 계가 — 승부 가리기',
            body:
              '바둑은 더 많은 집을 지은 쪽이 이기는 게임입니다. 내 돌로 둘러싼 빈 공간이 집이 되고, 마지막에 서로의 집을 세어 승부를 가립니다. 계가하는 방법까지 배우면 한 판을 온전히 끝낼 수 있어요.',
          },
          {
            title: '컴퓨터와 대국하며 실력 쌓기',
            body:
              '배운 내용을 바로 적용해 볼 수 있도록 컴퓨터 대국 기능을 제공합니다. 난이도를 조절할 수 있어 처음에는 쉽게, 익숙해지면 더 어렵게 도전할 수 있습니다. 집중력과 수 읽기 능력을 기르는 데 도움이 됩니다.',
          },
        ],
      }),
    ],
    // 워크스페이스 소스 패키지는 prebundle 하지 않고 소스로 컴파일
    optimizeDeps: { exclude: ['@soritok/auth', '@soritok/ads'] },
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
