import { useRef, useState } from 'react'
import type { GameProps } from '../types'

const N = 9
const MINES = 12
const NUM_COLORS = ['', '#5b8cf0', '#54e07c', '#ff6b6b', '#c069f0', '#f5a347', '#36cfe6', '#f7d23e', '#fff']

type Cell = { mine: boolean; rev: boolean; flag: boolean; n: number }

const fresh = (): Cell[][] =>
  Array.from({ length: N }, () => Array.from({ length: N }, () => ({ mine: false, rev: false, flag: false, n: 0 })))

const neighbors = (r: number, c: number): [number, number][] => {
  const out: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push([nr, nc])
    }
  return out
}

export default function MineGame({ onScore, onGameOver }: GameProps) {
  const [grid, setGrid] = useState<Cell[][]>(fresh)
  const [flagMode, setFlagMode] = useState(false)
  const [status, setStatus] = useState<'play' | 'dead' | 'win'>('play')
  const startedRef = useRef(false)
  const scoreRef = useRef(0)
  const flagsRef = useRef(0)
  const [flags, setFlags] = useState(0)

  function plantMines(g: Cell[][], safeR: number, safeC: number) {
    let placed = 0
    while (placed < MINES) {
      const r = Math.floor(Math.random() * N)
      const c = Math.floor(Math.random() * N)
      if (g[r][c].mine) continue
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue
      g[r][c].mine = true
      placed++
    }
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) g[r][c].n = neighbors(r, c).filter(([nr, nc]) => g[nr][nc].mine).length
  }

  function floodReveal(g: Cell[][], r: number, c: number) {
    const stack: [number, number][] = [[r, c]]
    while (stack.length) {
      const [cr, cc] = stack.pop()!
      const cell = g[cr][cc]
      if (cell.rev || cell.flag) continue
      cell.rev = true
      scoreRef.current++
      if (cell.n === 0 && !cell.mine) for (const [nr, nc] of neighbors(cr, cc)) if (!g[nr][nc].rev) stack.push([nr, nc])
    }
  }

  const tap = (r: number, c: number) => {
    if (status !== 'play') return
    const g = grid.map((row) => row.map((cell) => ({ ...cell })))
    if (flagMode) {
      if (g[r][c].rev) return
      g[r][c].flag = !g[r][c].flag
      flagsRef.current += g[r][c].flag ? 1 : -1
      setFlags(flagsRef.current)
      setGrid(g)
      return
    }
    if (g[r][c].flag) return
    if (!startedRef.current) {
      startedRef.current = true
      plantMines(g, r, c)
    }
    if (g[r][c].mine) {
      for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (g[rr][cc].mine) g[rr][cc].rev = true
      setGrid(g)
      setStatus('dead')
      setTimeout(() => onGameOver(scoreRef.current), 0)
      return
    }
    floodReveal(g, r, c)
    onScore(scoreRef.current)
    // 승리 체크: 지뢰 아닌 칸 모두 열림
    let safeLeft = 0
    for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (!g[rr][cc].mine && !g[rr][cc].rev) safeLeft++
    setGrid(g)
    if (safeLeft === 0) {
      scoreRef.current += 50
      onScore(scoreRef.current)
      setStatus('win')
      setTimeout(() => onGameOver(scoreRef.current), 0)
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 8px' }}>
        숫자는 주변 지뢰 수예요. 지뢰가 아닌 칸을 모두 여세요!
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>
          💣 {MINES} · 🚩 {flags}
        </span>
        <button
          onClick={() => setFlagMode((f) => !f)}
          style={{
            border: '1px solid rgba(255,255,255,0.15)',
            background: flagMode ? '#f5a347' : 'rgba(255,255,255,0.12)',
            color: flagMode ? '#1b1140' : '#fff',
            borderRadius: 999,
            padding: '6px 14px',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          🚩 깃발 {flagMode ? 'ON' : 'OFF'}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 3,
          width: 'min(90vw, 320px)',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: 6,
          borderRadius: 10,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const reveal = cell.rev
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tap(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (status === 'play' && !cell.rev) {
                    const g = grid.map((row2) => row2.map((x) => ({ ...x })))
                    g[r][c].flag = !g[r][c].flag
                    flagsRef.current += g[r][c].flag ? 1 : -1
                    setFlags(flagsRef.current)
                    setGrid(g)
                  }
                }}
                style={{
                  aspectRatio: '1 / 1',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 'min(3.4vw, 15px)',
                  color: cell.mine ? '#fff' : NUM_COLORS[cell.n],
                  background: reveal
                    ? cell.mine
                      ? '#ff6b6b'
                      : 'rgba(255,255,255,0.10)'
                    : 'linear-gradient(145deg, #5b53a0, #3c3578)',
                  boxShadow: reveal ? 'none' : 'inset 0 -2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {cell.flag && !reveal ? '🚩' : reveal ? (cell.mine ? '💣' : cell.n > 0 ? cell.n : '') : ''}
              </button>
            )
          }),
        )}
      </div>
      {status !== 'play' && (
        <div style={{ marginTop: 12, fontWeight: 800, color: status === 'win' ? '#54e07c' : '#ff6b6b' }}>
          {status === 'win' ? '🎉 클리어!' : '💥 지뢰를 밟았어요'}
        </div>
      )}
    </div>
  )
}
