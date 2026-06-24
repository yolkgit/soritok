import { useRef, useState } from 'react'
import type { GameProps } from '../types'

const R = 6
const C = 6
const FACES = ['🍎', '🍊', '🍇', '🍓', '🍌', '🥝', '🍑', '🍒', '🍍']

// 테두리 1칸 여백 포함 (R+2) x (C+2). 값: 이모지 인덱스 또는 -1(빈칸)
type Grid = number[][]

function makeGrid(): Grid {
  const total = R * C
  const pairs = total / 2
  const pool: number[] = []
  for (let i = 0; i < pairs; i++) {
    const f = i % FACES.length
    pool.push(f, f)
  }
  pool.sort(() => Math.random() - 0.5)
  const g: Grid = Array.from({ length: R + 2 }, () => Array<number>(C + 2).fill(-1))
  let k = 0
  for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) g[r][c] = pool[k++]
  return g
}

export default function LinkGame({ onScore, onGameOver }: GameProps) {
  const [grid, setGrid] = useState<Grid>(makeGrid)
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null)
  const [bad, setBad] = useState(false)
  const scoreRef = useRef(0)
  const overRef = useRef(false)

  const passable = (g: Grid, r: number, c: number) => g[r][c] === -1

  // a → b 를 2번 이하 꺾어 빈칸으로 연결 가능?
  function canConnect(g: Grid, a: { r: number; c: number }, b: { r: number; c: number }): boolean {
    const H = R + 2
    const Wd = C + 2
    // BFS: 상태 (r,c,dir,turns). dir: 0=상,1=하,2=좌,3=우, -1=시작
    const DR = [-1, 1, 0, 0]
    const DC = [0, 0, -1, 1]
    const seen = new Set<string>()
    const q: [number, number, number, number][] = [[a.r, a.c, -1, 0]]
    while (q.length) {
      const [r, c, dir, turns] = q.shift()!
      for (let d = 0; d < 4; d++) {
        const nt = dir === -1 || dir === d ? turns : turns + 1
        if (nt > 2) continue
        let nr = r + DR[d]
        let nc = c + DC[d]
        while (nr >= 0 && nr < H && nc >= 0 && nc < Wd) {
          if (nr === b.r && nc === b.c) return true
          if (!passable(g, nr, nc)) break
          const key = `${nr},${nc},${d},${nt}`
          if (!seen.has(key)) {
            seen.add(key)
            q.push([nr, nc, d, nt])
          }
          nr += DR[d]
          nc += DC[d]
        }
      }
    }
    return false
  }

  function hasMoves(g: Grid): boolean {
    const cells: { r: number; c: number; v: number }[] = []
    for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) if (g[r][c] !== -1) cells.push({ r, c, v: g[r][c] })
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++)
        if (cells[i].v === cells[j].v && canConnect(g, cells[i], cells[j])) return true
    return false
  }

  const tap = (r: number, c: number) => {
    if (overRef.current || grid[r][c] === -1) return
    if (!sel) {
      setSel({ r, c })
      return
    }
    if (sel.r === r && sel.c === c) {
      setSel(null)
      return
    }
    if (grid[sel.r][sel.c] === grid[r][c] && canConnect(grid, sel, { r, c })) {
      const g = grid.map((row) => [...row])
      g[sel.r][sel.c] = -1
      g[r][c] = -1
      scoreRef.current += 5
      onScore(scoreRef.current)
      setSel(null)
      // 전부 비었으면 새 판 + 보너스
      let left = 0
      for (let rr = 1; rr <= R; rr++) for (let cc = 1; cc <= C; cc++) if (g[rr][cc] !== -1) left++
      if (left === 0) {
        scoreRef.current += 30
        onScore(scoreRef.current)
        setGrid(makeGrid())
      } else {
        setGrid(g)
        if (!hasMoves(g)) {
          overRef.current = true
          setTimeout(() => onGameOver(scoreRef.current), 0)
        }
      }
    } else {
      setBad(true)
      setTimeout(() => setBad(false), 200)
      setSel({ r, c })
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 12px' }}>
        같은 그림 두 개를 고르세요. 두 번 이하로 꺾어 이어지면 사라져요!
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${C}, 1fr)`,
          gap: 5,
          width: 'min(90vw, 320px)',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: 8,
          borderRadius: 12,
        }}
      >
        {Array.from({ length: R }).map((_, ri) =>
          Array.from({ length: C }).map((_, ci) => {
            const r = ri + 1
            const c = ci + 1
            const v = grid[r][c]
            const isSel = sel?.r === r && sel?.c === c
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tap(r, c)}
                style={{
                  aspectRatio: '1 / 1',
                  border: isSel ? `2px solid ${bad ? '#ff6b6b' : '#7c5cff'}` : '2px solid transparent',
                  borderRadius: 8,
                  cursor: v === -1 ? 'default' : 'pointer',
                  background: v === -1 ? 'transparent' : isSel ? 'rgba(124,92,255,0.25)' : 'rgba(255,255,255,0.92)',
                  fontSize: 'min(7vw, 28px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: v === -1 ? 'none' : 'inset 0 -3px 5px rgba(0,0,0,0.18)',
                }}
              >
                {v === -1 ? '' : FACES[v]}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
