import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoContent } from './build/seoContent'

// 모노레포에서 /study/ 경로 아래로 서비스됩니다.
export default defineConfig({
  base: '/study/',
  plugins: [
    react(),
    tailwindcss(),
    // 크롤러용 정적 소개 콘텐츠 (SPA는 JS 전엔 빈 화면이라 필요)
    seoContent({
      heading: '📚 과목별 시험정리 — 영어·수학·과학·사회',
      intro:
        '초·중·고 학년별, 학기별, 단원별 시험정리 노트입니다. 색볼펜과 형광펜으로 정리한 손글씨 노트 형식이라 눈에 잘 들어오고, 시험 전 빠르게 훑어보기 좋습니다.',
      sections: [
        {
          title: '영어 — 문법과 어휘를 단원별로',
          body:
            '교과서 단원 순서에 맞춰 핵심 문법과 필수 어휘를 정리했습니다. 시제, 조동사, 관계대명사처럼 헷갈리기 쉬운 문법은 예문과 함께 비교해 두었고, 단원별 필수 표현은 시험에 나오는 형태로 묶어 정리했습니다.',
        },
        {
          title: '수학 — 개념부터 유형별 풀이까지',
          body:
            '각 단원의 개념 정의와 공식을 먼저 정리하고, 시험에 자주 나오는 문제 유형을 풀이 과정과 함께 담았습니다. 틀리기 쉬운 부분은 따로 표시해 두어 실수를 줄일 수 있습니다.',
        },
        {
          title: '과학 — 원리를 그림으로 이해하기',
          body:
            '물질, 힘과 운동, 생명, 지구와 우주 등 단원별 핵심 개념을 그림과 함께 정리했습니다. 실험 과정과 결과, 그로부터 알 수 있는 원리를 연결해 설명해 암기가 아닌 이해로 접근할 수 있습니다.',
        },
        {
          title: '사회 — 흐름으로 잡는 역사와 개념',
          body:
            '역사는 시대 순 흐름과 인과관계를 중심으로, 지리·경제·정치 영역은 핵심 개념과 사례를 묶어 정리했습니다. 표와 연표를 활용해 복잡한 내용을 한눈에 파악할 수 있습니다.',
        },
        {
          title: '꾸준히 업데이트됩니다',
          body:
            '새로운 학년·학기·단원 정리가 계속 추가됩니다. 학년과 과목을 선택하면 해당하는 정리 노트를 바로 확인할 수 있습니다.',
        },
      ],
    }),
  ],
  optimizeDeps: { exclude: ['@soritok/auth', '@soritok/ads'] },
})
