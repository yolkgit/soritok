import type { Service } from '../types'

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │  소리톡 책상에 놓이는 서비스 목록.                              │
 * │  새 서비스는 객체 하나만 추가하면 됩니다.                        │
 * │  - kind: 표현 사물 (board/goban/aquarium/arcade/book/note)      │
 * │  - book 종류는 자동으로 '책장'에 모여 꽂힙니다.                  │
 * │  - url : 실제 서비스 주소로 교체                                 │
 * │  - status: 'active'(이용가능) | 'coming-soon'(준비중)            │
 * └─────────────────────────────────────────────────────────────┘
 */
export const services: Service[] = [
  // ── 벽 보드판 ──
  {
    id: 'weekly',
    kind: 'board',
    title: '위클리 페이퍼',
    subtitle: '아이 주간 계획표 & 보상',
    description:
      '아이와 부모가 함께 쓰는 주간 계획표예요. 드래그앤드롭으로 일정을 짜고, 활동을 완료하면 포인트를 모아 보상 상점에서 교환할 수 있어요. PDF로 뽑아 냉장고에 붙여보세요.',
    url: '/weekly/',
    color: '#E8743B',
    emoji: '📅',
    status: 'active',
  },

  // ── 책장: 과목별 교육 (kind:'book' 은 자동으로 책장에 모임) ──
  {
    id: 'edu-english',
    kind: 'book',
    title: '영어교육',
    subtitle: '재미있게 시작하는 영어',
    description: '파닉스부터 회화까지, 아이 눈높이에 맞춘 영어 학습 콘텐츠예요.',
    url: 'https://english.soritok.com',
    color: '#3B73B9',
    emoji: '🔤',
    status: 'coming-soon',
  },
  {
    id: 'edu-math',
    kind: 'book',
    title: '수학교육',
    subtitle: '개념부터 탄탄하게',
    description: '연산·도형·사고력까지 단계별로 익히는 수학 학습 콘텐츠예요.',
    url: 'https://math.soritok.com',
    color: '#E05A5A',
    emoji: '➗',
    status: 'coming-soon',
  },
  {
    id: 'edu-science',
    kind: 'book',
    title: '과학교육',
    subtitle: '호기심을 키우는 과학',
    description: '실험과 관찰로 자연의 원리를 즐겁게 배우는 과학 학습 콘텐츠예요.',
    url: 'https://science.soritok.com',
    color: '#2F9C6A',
    emoji: '🔬',
    status: 'coming-soon',
  },
  {
    id: 'edu-social',
    kind: 'book',
    title: '사회교육',
    subtitle: '세상을 넓게 보는 눈',
    description: '역사·지리·생활 속 사회를 이야기로 풀어내는 학습 콘텐츠예요.',
    url: 'https://social.soritok.com',
    color: '#E0913A',
    emoji: '🌍',
    status: 'coming-soon',
  },

  // ── 책상 위 사물 ──
  {
    id: 'gnugo',
    kind: 'goban',
    title: '어린이 바둑교실',
    subtitle: '놀이처럼 배우는 첫 바둑',
    description:
      '바둑을 처음 만나는 아이들을 위한 교실이에요. 돌 놓기부터 따내기, 집 짓기까지 단계별로 즐겁게 배워요.',
    url: '/gnugo/',
    color: '#2F6F4E',
    emoji: '⚫',
    status: 'active',
  },
  {
    id: 'fish',
    kind: 'aquarium',
    title: '관상어 도감',
    subtitle: '우리집 물고기 친구들',
    description:
      '구피·베타·금붕어부터 열대어까지, 관상어를 그림과 함께 찾아보고 키우는 방법을 배우는 도감이에요.',
    url: 'https://fish.soritok.com',
    color: '#2BA6C9',
    emoji: '🐠',
    status: 'coming-soon',
  },
  {
    id: 'games',
    kind: 'arcade',
    title: '미니 게임',
    subtitle: '간단하게 즐기는 여러 게임',
    description:
      '짬짬이 즐기는 가벼운 미니 게임 모음이에요. 퍼즐·기억력·반응 속도 게임 등을 한 곳에서 플레이하세요.',
    url: 'https://games.soritok.com',
    color: '#8A5BD6',
    emoji: '🎮',
    status: 'coming-soon',
  },

  // ── 앞으로 추가될 서비스 자리 ──
  {
    id: 'coming-1',
    kind: 'note',
    title: '준비중',
    subtitle: '곧 새로운 서비스가 열려요',
    description: '소리톡 책상에 새로운 서비스를 준비하고 있어요. 조금만 기다려 주세요!',
    url: '#',
    color: '#E0B33A',
    emoji: '✨',
    status: 'coming-soon',
  },
]
