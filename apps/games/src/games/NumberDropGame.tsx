import { useRef, useState } from 'react'
import type { GameProps } from '../types'

const COLS = 5
const MAXROW = 7

const TILE: Record<number, { bg: string; fg: string }> = {
  2: { bg: '#eee4da', fg: '#776e65' },
  4: { bg: '#ede0c8', fg: '#776e65' },
  8: { bg: '#f2b179', fg: '#fff' },
  16: { bg: '#f59563', fg: '#fff' },
  32: { bg: '#f67c5f', fg: '#fff' },
  64: { bg: '#f65e3b', fg: '#fff' },
  128: { bg: '#edcf72', fg: '#fff' },
  256: { bg: '#edcc61', fg: '#fff' },
  512: { bg: '#edc850', fg: '#fff' },
  1024: { bg: '#edc53f', fg: '#fff' },
  2048: { bg: '#edc22e', fg: '#fff' },
}
const tileOf = (v: number) => TILE[v] ?? { bg: '#3c3a32', fg: '#fff' }

const randNum = () => {
  const r = Math.random()
  return r < 0.6 ? 2 : r < 0.9 ? 4 : 8
}

export default function NumberDropGame({ onScore, onGameOver }: GameProps) {
  const [cols, setCols] = useState<number[][]>(() => Array.from({ length: COLS }, () => []))
  const [cur, setCur] = useState(randNum)
  const [nxt, setNxt] = useState(randNum)
  const scoreRef = useRef(0)
  const overRef = useRef(false)

  const drop = (c: number) => {
    if (overRef.current) return
    const next = cols.map((col) => col.slice())
    next[c].push(cur)
    // 연쇄 병합 (위 두 개가 같으면 합치기)
    while (next[c].length >= 2 && next[c][next[c].length - 1] === next[c][next[c].length - 2]) {
      const a = next[c].pop()!
      next[c].pop()
      const merged = a * 2
      next[c].push(merged)
      scoreRef.current += merged
    }
    onScore(scoreRef.current)
    setCols(next)
    setCur(nxt)
    setNxt(randNum())

    if (next[c].length > MAXROW) {
      overRef.current = true
      setTimeout(() => onGameOver(scoreRef.current), 0)
    }
  }

  const cell = (v: number | undefined) => {
    const t = v ? tileOf(v) : null
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: v && v >= 128 ? 'min(3.6vw, 15px)' : 'min(4.4vw, 19px)',
          background: t ? t.bg : 'rgba(255,255,255,0.05)',
          color: t ? t.fg : 'transparent',
        }}
      >
        {v ?? ''}
      </div>
    )
  }

  const c0 = tileOf(cur)
  const n0 = tileOf(nxt)

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 8px' }}>
        칸을 눌러 숫자를 떨어뜨리세요. 같은 숫자끼리 만나면 합쳐져요! (넘치면 끝)
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, margin: '0 0 12px' }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>다음</span>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 7,
            background: n0.bg,
            color: n0.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {nxt}
        </div>
        <span style={{ fontSize: 13, opacity: 0.7 }}>지금</span>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 9,
            background: c0.bg,
            color: c0.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 18,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {cur}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 6,
          width: 'min(86vw, 320px)',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: 6,
          borderRadius: 12,
        }}
      >
        {cols.map((col, c) => (
          <button
            key={c}
            onClick={() => drop(c)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding: 3,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: 4,
              minHeight: 'min(64vw, 240px)',
            }}
          >
            {Array.from({ length: MAXROW }).map((_, r) => (
              <span key={r} style={{ display: 'block' }}>
                {cell(col[r])}
              </span>
            ))}
          </button>
        ))}
      </div>
    </div>
  )
}
