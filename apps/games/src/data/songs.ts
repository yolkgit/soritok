// 리듬게임 곡 라이브러리 — 멀티트랙(멜로디/코드/베이스/드럼) "MIDI식" 데이터.
//
// ⚠️ 저작권: 실제 K-pop 곡 멜로디는 보호 대상이라 그대로 임베드 불가.
//   아래는 모두 오리지널(저작권 free) 트랙입니다. 매월 month 를 바꿔
//   새 곡 세트로 교체하면 "이달의 곡"이 갱신됩니다(중복 title 자동 제외).

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFFS: { id: Difficulty; label: string; stars: number }[] = [
  { id: 'easy', label: '쉬움', stars: 1 },
  { id: 'normal', label: '보통', stars: 2 },
  { id: 'hard', label: '어려움', stars: 3 },
]

// 코드 구성음(반음 간격)
const CH: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
}

// 멜로디 표기: [midi(0=쉼표), 길이(16분음표 단위)] 순차
type Seq = [number, number][]

export type Song = {
  id: string
  title: string
  artist: string
  color: string
  bpm: number
  month: string // 'YYYY-MM' — 이달의 곡 갱신용
  loops: number // 멜로디 섹션 반복 횟수
  melody: Seq
  chords: [number, keyof typeof CH][] // 마디별 [rootMidi, 'maj'|'min']
}

// ───────────────── 오리지널 곡 (저작권 free) ─────────────────
export const ALL_SONGS: Song[] = [
  {
    id: 'neon-drive',
    title: '네온 드라이브',
    artist: '소리톡 오리지널',
    color: '#36cfe6',
    bpm: 124,
    month: '2026-06',
    loops: 3,
    chords: [[60, 'maj'], [55, 'maj'], [57, 'min'], [53, 'maj']], // C G Am F
    melody: [
      [76, 2], [72, 2], [76, 2], [79, 4], [76, 2], [72, 2], [74, 2],
      [74, 2], [71, 2], [74, 4], [79, 4], [77, 2], [76, 2],
      [72, 2], [69, 2], [72, 4], [76, 4], [74, 2], [72, 2],
      [69, 2], [72, 2], [77, 4], [76, 4], [72, 2], [69, 2],
    ],
  },
  {
    id: 'starlit',
    title: '별빛 산책',
    artist: '소리톡 오리지널',
    color: '#54e07c',
    bpm: 96,
    month: '2026-06',
    loops: 3,
    chords: [[57, 'min'], [53, 'maj'], [60, 'maj'], [55, 'maj']], // Am F C G
    melody: [
      [69, 4], [72, 4], [76, 6], [0, 2],
      [77, 4], [76, 4], [72, 6], [0, 2],
      [72, 4], [76, 4], [79, 6], [0, 2],
      [74, 4], [71, 4], [67, 4], [0, 4],
    ],
  },
  {
    id: 'overdrive',
    title: '오버드라이브',
    artist: '소리톡 오리지널',
    color: '#ff6b6b',
    bpm: 150,
    month: '2026-06',
    loops: 3,
    chords: [[60, 'maj'], [55, 'maj'], [57, 'min'], [53, 'maj']], // C G Am F
    melody: [
      [72, 2], [76, 2], [79, 2], [76, 2], [72, 2], [76, 2], [79, 2], [84, 2],
      [83, 2], [79, 2], [74, 2], [79, 2], [77, 2], [74, 2], [71, 2], [67, 2],
      [69, 2], [72, 2], [76, 2], [81, 2], [76, 2], [72, 2], [69, 2], [64, 2],
      [65, 2], [69, 2], [72, 2], [77, 2], [76, 2], [72, 2], [67, 2], [72, 2],
    ],
  },
]

/** 이달의 곡(현재 활성 카탈로그). title 기준 중복 제외. */
export function activeSongs(): Song[] {
  const seen = new Set<string>()
  const out: Song[] = []
  for (const s of ALL_SONGS) {
    const key = s.title.trim().toLowerCase()
    if (seen.has(key)) continue // 중복 곡 제외
    seen.add(key)
    out.push(s)
  }
  return out
}

// ───────────────── 차트 빌드 (난이도별) ─────────────────
export type ChartNote = { beat: number; lane: number; freq: number }
export type Voice = { beat: number; freq: number; dur: number }
export type DrumHit = { beat: number; kind: 'kick' | 'snare' | 'hat' }
export type BuiltChart = {
  bpm: number
  totalBeats: number
  notes: ChartNote[] // 게임플레이(리드)
  pad: Voice[] // 코드 패드
  bass: Voice[]
  drums: DrumHit[]
}

type Mel = { beat: number; midi: number; dur: number }

function expandMelody(song: Song): { mel: Mel[]; sectionBeats: number } {
  const one: Mel[] = []
  let b = 0
  for (const [midi, len] of song.melody) {
    const dur = len / 4
    if (midi > 0) one.push({ beat: b, midi, dur })
    b += dur
  }
  const sectionBeats = b
  const mel: Mel[] = []
  for (let k = 0; k < song.loops; k++) {
    for (const n of one) mel.push({ beat: n.beat + k * sectionBeats, midi: n.midi, dur: n.dur })
  }
  return { mel, sectionBeats }
}

const onGrid = (beat: number, div: number) => Math.abs(beat * div - Math.round(beat * div)) < 1e-6

export function buildChart(song: Song, diff: Difficulty): BuiltChart {
  const { mel, sectionBeats } = expandMelody(song)
  const totalBeats = sectionBeats * song.loops

  // 난이도 필터: easy=정박만, normal=8분 그리드, hard=전부
  const filtered =
    diff === 'hard'
      ? mel
      : diff === 'normal'
        ? mel.filter((n) => onGrid(n.beat, 2))
        : mel.filter((n) => onGrid(n.beat, 1))

  // 레인 매핑: 음높이를 4구간으로
  let lo = Infinity
  let hi = -Infinity
  for (const n of mel) {
    lo = Math.min(lo, n.midi)
    hi = Math.max(hi, n.midi)
  }
  const span = Math.max(1, hi - lo)
  const laneOf = (midi: number) => Math.max(0, Math.min(3, Math.round(((midi - lo) / span) * 3)))

  const notes: ChartNote[] = filtered.map((n) => ({ beat: n.beat, lane: laneOf(n.midi), freq: mtof(n.midi) }))

  // 백킹: 마디별 코드 패드 + 베이스 + 드럼
  const pad: Voice[] = []
  const bass: Voice[] = []
  const drums: DrumHit[] = []
  const bars = Math.ceil(totalBeats / 4)
  for (let bar = 0; bar < bars; bar++) {
    const [root, type] = song.chords[bar % song.chords.length]
    const beat0 = bar * 4
    for (const iv of CH[type]) pad.push({ beat: beat0, freq: mtof(root + iv), dur: 3.6 })
    bass.push({ beat: beat0, freq: mtof(root - 24), dur: 0.9 })
    bass.push({ beat: beat0 + 2, freq: mtof(root - 24), dur: 0.9 })
    drums.push({ beat: beat0, kind: 'kick' }, { beat: beat0 + 2, kind: 'kick' })
    drums.push({ beat: beat0 + 1, kind: 'snare' }, { beat: beat0 + 3, kind: 'snare' })
    for (let h = 0; h < 4; h += 0.5) drums.push({ beat: beat0 + h, kind: 'hat' })
  }

  return { bpm: song.bpm, totalBeats, notes, pad, bass, drums }
}
