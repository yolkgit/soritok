import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const N = 4
const SIZE = N * N

const goal = (b: number[]) => b.every((v, i) => (i < SIZE - 1 ? v === i + 1 : v === 0))

function inversions(b: number[]) {
  const a = b.filter((x) => x !== 0)
  let inv = 0
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++
  return inv
}

function shuffled(): number[] {
  const base = [...Array(SIZE).keys()].map((i) => (i + 1) % SIZE) // 1..15,0
  let b = base.slice()
  do {
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[b[i], b[j]] = [b[j], b[i]]
    }
    const blankRowFromBottom = N - Math.floor(b.indexOf(0) / N)
    const ok = (inversions(b) + blankRowFromBottom) % 2 === 1
    if (!ok) {
      // 두 타일 스왑으로 풀이가능 패리티 맞추기
      const i = b[0] !== 0 && b[1] !== 0 ? 0 : 2
      ;[b[i], b[i + 1]] = [b[i + 1], b[i]]
    }
  } while (goal(b))
  return b
}

export default function SlidePuzzleGame({ onScore, onGameOver }: GameProps) {
  const [board, setBoard] = useState<number[]>(shuffled)
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)
  const overRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => {
      if (!overRef.current) setTime((s) => s + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const slide = (i: number) => {
    if (overRef.current) return
    const blank = board.indexOf(0)
    const br = Math.floor(blank / N)
    const bc = blank % N
    const r = Math.floor(i / N)
    const c = i % N
    if (Math.abs(br - r) + Math.abs(bc - c) !== 1) return
    const nb = board.slice()
    ;[nb[blank], nb[i]] = [nb[i], nb[blank]]
    const m = moves + 1
    setMoves(m)
    setBoard(nb)
    audio.play('click')
    if (goal(nb)) {
      overRef.current = true
      audio.play('win')
      const score = Math.max(100, 3000 - m * 12 - time * 4)
      onScore(score)
      setTimeout(() => onGameOver(score), 0)
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        빈칸 옆 숫자를 눌러 밀어서 1~15 순서대로 맞추세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 14, margin: '0 0 12px' }}>
        이동 {moves} · 시간 {time}s
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 6,
          width: 'min(82vw, 300px)',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: 8,
          borderRadius: 12,
        }}
      >
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => slide(i)}
            disabled={v === 0}
            style={{
              aspectRatio: '1 / 1',
              border: 'none',
              borderRadius: 10,
              cursor: v === 0 ? 'default' : 'pointer',
              fontSize: 'min(6vw, 24px)',
              fontWeight: 800,
              color: '#1b1140',
              background:
                v === 0
                  ? 'transparent'
                  : `linear-gradient(135deg, #f7d23e, #f5a347)`,
              boxShadow: v === 0 ? 'none' : '0 3px 8px rgba(0,0,0,0.25)',
            }}
          >
            {v || ''}
          </button>
        ))}
      </div>
    </div>
  )
}
