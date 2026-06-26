// 리듬게임 곡 라이브러리 — 난이도별 곡 + 패턴(차트)
// 멜로디 = 노트 레인의 음정(scale), 드럼/베이스는 grid 기준으로 자동 생성.

export type Song = {
  id: string
  title: string
  level: '초급' | '중급' | '고급'
  stars: number // 1~5
  bpm: number
  color: string
  grid: number // 한 박자당 스텝 수 (2 = 8분음표, 4 = 16분음표)
  bars: number // 곡 길이(마디)
  scale: number[] // 4개 레인의 음정(Hz)
  bass: number[] // 마디별 베이스 루트(반복)
  notes: number[][] // 스텝별 노트 레인 (반복). [] = 빈 스텝
}

const C5 = 523.25
const D5 = 587.33
const E5 = 659.25
const F5 = 698.46
const G5 = 783.99
const A5 = 880.0
const B5 = 987.77
const A4 = 440.0
const C2 = 65.41
const D2 = 73.42
const E2 = 82.41
const F2 = 87.31
const G2 = 98.0
const A2 = 110.0

export const SONGS: Song[] = [
  {
    id: 'stroll',
    title: '산책',
    level: '초급',
    stars: 1,
    bpm: 92,
    color: '#54e07c',
    grid: 2,
    bars: 18,
    scale: [C5, D5, E5, G5],
    bass: [C2, C2, G2, G2],
    // 1마디(8스텝) 반복: 박자마다 한 레인씩 차분하게
    notes: [[0], [], [1], [], [2], [], [3], []],
  },
  {
    id: 'heartbeat',
    title: '두근두근',
    level: '중급',
    stars: 3,
    bpm: 124,
    color: '#36cfe6',
    grid: 2,
    bars: 24,
    scale: [A4, C5, D5, E5],
    bass: [A2, A2, F2, G2],
    // 2마디(16스텝) 패턴
    notes: [
      [0], [], [2], [1], [3], [], [2], [0],
      [1], [], [3], [2], [0], [2], [1], [3],
    ],
  },
  {
    id: 'neon',
    title: '네온 러시',
    level: '중급',
    stars: 4,
    bpm: 136,
    color: '#c069f0',
    grid: 2,
    bars: 26,
    scale: [E5, G5, A5, B5],
    bass: [E2, C2, D2, G2],
    notes: [
      [0], [1], [2], [], [3], [2], [1], [0],
      [2], [3], [1], [2], [0], [1], [3], [2],
    ],
  },
  {
    id: 'overdrive',
    title: '폭주 비트',
    level: '고급',
    stars: 5,
    bpm: 156,
    color: '#ff6b6b',
    grid: 2,
    bars: 30,
    scale: [D5, F5, G5, A5],
    bass: [D2, D2, A2, F2],
    // 동시 2레인(코드) 포함, 빈 스텝 거의 없음
    notes: [
      [0, 3], [1], [2], [0], [3], [1, 2], [0], [3],
      [2], [0, 1], [3], [2], [1, 3], [0], [2], [1],
    ],
  },
]

export const getSong = (id: string): Song | undefined => SONGS.find((s) => s.id === id)
