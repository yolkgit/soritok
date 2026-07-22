import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoContent } from './seo/seoContent';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 모노레포에서 /weekly/ 경로 아래로 서비스됩니다.
    base: '/weekly/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      // 크롤러용 정적 소개 콘텐츠 (SPA는 JS 전엔 빈 화면이라 필요)
      seoContent({
        heading: '📅 위클리 페이퍼 — 아이 주간 계획표 & 보상',
        intro:
          '아이와 부모가 함께 쓰는 주간 계획표입니다. 드래그앤드롭으로 일주일 일정을 짜고, 활동을 완료하면 포인트를 모아 보상 상점에서 원하는 것과 교환할 수 있어요. PDF로 출력해 냉장고에 붙여둘 수도 있습니다.',
        sections: [
          {
            title: '드래그앤드롭으로 일주일 계획 세우기',
            body:
              '월요일부터 일요일까지 요일별로 활동을 배치합니다. 공부, 운동, 집안일, 취미 등 활동을 만들어 원하는 요일과 시간대로 끌어다 놓기만 하면 됩니다. 아이와 함께 계획을 세우면 스스로 하루를 관리하는 습관을 기를 수 있습니다.',
          },
          {
            title: '완료하면 포인트 적립',
            body:
              '계획한 활동을 마치고 체크하면 포인트가 쌓입니다. 활동마다 포인트를 다르게 설정할 수 있어, 어려운 일에는 더 큰 보상을 걸 수 있습니다. 눈에 보이는 성취가 쌓이면서 아이가 스스로 움직이게 됩니다.',
          },
          {
            title: '보상 상점에서 교환하기',
            body:
              '모은 포인트로 보상 상점에서 원하는 항목을 교환합니다. 보상 목록은 가족이 직접 정할 수 있어요. 간식, 놀이 시간, 갖고 싶던 물건 등 아이가 기대할 만한 것으로 채워 보세요.',
          },
          {
            title: 'PDF로 출력해서 붙여두기',
            body:
              '완성한 주간 계획표는 PDF로 저장하고 인쇄할 수 있습니다. 냉장고나 아이 책상 앞에 붙여두면 화면을 켜지 않아도 하루 계획을 확인할 수 있어 실천율이 올라갑니다.',
          },
        ],
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    }
  };
});
