import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoContent } from './seo/seoContent'

// 모노레포에서 /mbti/ 경로 아래로 서비스됩니다.
export default defineConfig({
  base: '/mbti/',
  plugins: [
    react(),
    tailwindcss(),
    // 크롤러용 정적 소개 콘텐츠 (SPA는 JS 전엔 빈 화면이라 필요)
    seoContent({
      heading: '🪞 64유형 MBTI — 나를 비춰보는 성격 테스트',
      intro:
        '기존 16유형 MBTI에 확신형·민감형(A/T)과 관계 방식(광역형·심층형) 축을 더해 64가지 유형으로 세분화한 성격 테스트입니다. 30문항으로 나의 진짜 성향을 확인해 보세요.',
      sections: [
        {
          title: '기존 16유형에서 64유형으로',
          body:
            '전통적인 MBTI는 외향/내향(E-I), 감각/직관(S-N), 사고/감정(T-F), 판단/인식(J-P) 네 축으로 16가지 유형을 나눕니다. 이 테스트는 여기에 자신감의 정도(확신형 A / 민감형 T)와 관계를 맺는 방식(광역형 / 심층형) 두 축을 더해 총 64가지로 더 정밀하게 성향을 구분합니다.',
        },
        {
          title: '30문항, 5분이면 충분해요',
          body:
            '문항마다 일상에서 겪을 법한 상황이 제시됩니다. 정답은 없으니 깊이 고민하지 말고 평소 나와 가까운 쪽을 고르면 됩니다. 대략 5분이면 끝나고, 바로 결과를 확인할 수 있습니다.',
        },
        {
          title: '결과로 알 수 있는 것',
          body:
            '나의 유형 코드와 함께 성격 특징, 강점, 주의할 점, 잘 맞는 유형을 확인할 수 있습니다. 자기 이해를 돕고, 가족이나 친구와 서로의 결과를 비교해 보며 관계를 이해하는 데도 도움이 됩니다.',
        },
        {
          title: '결과 공유하기',
          body:
            '검사 결과는 링크로 친구에게 공유할 수 있습니다. 서로 어떤 유형인지 비교해 보면 평소 왜 그렇게 행동했는지 이해되는 순간이 생기기도 합니다. 성격 유형은 우열이 아니라 서로 다른 방식일 뿐입니다.',
        },
      ],
    }),
  ],
  optimizeDeps: { exclude: ['@soritok/auth', '@soritok/ads'] },
})
