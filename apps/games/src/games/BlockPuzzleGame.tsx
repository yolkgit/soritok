import { useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const N = 9
const COLORS = ['#ff6b6b', '#f5a347', '#f7d23e', '#54e07c', '#36cfe6', '#5b8cf0', '#c069f0']

type Cell = string | null
type Shape = [number, number][]
type Piece = { cells: Shape; color: string }

const SHAPES: Shape[] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
]

const randPiece = (): Piece => ({
  cells: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
})
const emptyBoard = (): Cell[][] => Array.from({ length: N }, () => Array<Cell>(N).fill(null))
const dims = (cells: Shape) => {
  let mr = 0
  let mc = 0
  for (const [r, c] of cells) {
    mr = Math.max(mr, r)
    mc = Math.max(mc, c)
  }
  return [mr + 1, mc + 1]
}

export default function BlockPuzzleGame({ onScore, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Cell[][]>(emptyBoard)
  const [tray, setTray] = useState<(Piece | null)[]>(() => [randPiece(), randPiece(), randPiece()])
  const [sel, setSel] = useState<number | null>(0)
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const scoreRef = useRef(0)
  const overRef = useRef(false)

  const fits = (b: Cell[][], cells: Shape, r0: number, c0: number) =>
    cells.every(([dr, dc]) => {
      const r = r0 + dr
      const c = c0 + dc
      return r >= 0 && r < N && c >= 0 && c < N && b[r][c] === null
    })

  const canPlaceAnywhere = (b: Cell[][], cells: Shape) => {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(b, cells, r, c)) return true
    return false
  }

  function place(idx: number, r0: number, c0: number) {
    if (overRef.current) return
    const piece = tray[idx]
    if (!piece || !fits(board, piece.cells, r0, c0)) return
    const b = board.map((row) => [...row])
    for (const [dr, dc] of piece.cells) b[r0 + dr][c0 + dc] = piece.color
    scoreRef.current += piece.cells.length
    audio.play('click')

    const fullRows: number[] = []
    const fullCols: number[] = []
    for (let r = 0; r < N; r++) if (b[r].every((x) => x !== null)) fullRows.push(r)
    for (let c = 0; c < N; c++) {
      let full = true
      for (let r = 0; r < N; r++) if (b[r][c] === null) full = false
      if (full) fullCols.push(c)
    }
    const lines = fullRows.length + fullCols.length
    for (const r of fullRows) for (let c = 0; c < N; c++) b[r][c] = null
    for (const c of fullCols) for (let r = 0; r < N; r++) b[r][c] = null
    if (lines > 0) {
      scoreRef.current += lines * 10 + (lines > 1 ? lines * 5 : 0)
      audio.play('levelup')
    }
    onScore(scoreRef.current)

    const nt = tray.slice()
    nt[idx] = null
    let next = nt
    if (nt.every((p) => p === null)) next = [randPiece(), randPiece(), randPiece()]
    setBoard(b)
    setTray(next)
    const remainingIdx = next.findIndex((p) => p !== null)
    setSel(remainingIdx >= 0 ? remainingIdx : null)
    setHover(null)

    const remaining = next.filter((p): p is Piece => p !== null)
    if (remaining.length && !remaining.some((p) => canPlaceAnywhere(b, p.cells))) {
      overRef.current = true
      setTimeout(() => onGameOver(scoreRef.current), 0)
    }
  }

  // 미리보기(고스트) 셀 여부
  const ghost = (r: number, c: number): string | null => {
    if (sel === null || !hover) return null
    const p = tray[sel]
    if (!p || !fits(board, p.cells, hover.r, hover.c)) return null
    return p.cells.some(([dr, dc]) => hover.r + dr === r && hover.c + dc === c) ? p.color : null
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        아래 조각을 골라 칸을 채우세요. 한 줄·한 열이 가득 차면 사라져요!
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 2,
          width: 'min(86vw, 324px)',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: 5,
          borderRadius: 10,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const g = ghost(r, c)
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => sel !== null && place(sel, r, c)}
                onMouseEnter={() => setHover({ r, c })}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 4,
                  cursor: sel !== null ? 'pointer' : 'default',
                  background: cell ?? (g ? `${g}88` : 'rgba(255,255,255,0.06)'),
                  boxShadow: cell ? 'inset 0 -2px 3px rgba(0,0,0,0.25)' : 'none',
                }}
              />
            )
          }),
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        {tray.map((p, i) => {
          const [rows, cols] = p ? dims(p.cells) : [1, 1]
          return (
            <button
              key={i}
              onClick={() => p && setSel(i)}
              disabled={!p}
              style={{
                width: 86,
                height: 86,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                border: sel === i && p ? '2px solid #7c5cff' : '2px solid rgba(255,255,255,0.1)',
                background: sel === i && p ? 'rgba(124,92,255,0.15)' : 'rgba(255,255,255,0.06)',
                cursor: p ? 'pointer' : 'default',
                padding: 8,
              }}
            >
              {p && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gap: 2,
                  }}
                >
                  {Array.from({ length: rows * cols }).map((_, k) => {
                    const rr = Math.floor(k / cols)
                    const cc = k % cols
                    const on = p.cells.some(([dr, dc]) => dr === rr && dc === cc)
                    return (
                      <div
                        key={k}
                        style={{
                          width: 'min(4.4vw, 15px)',
                          height: 'min(4.4vw, 15px)',
                          borderRadius: 3,
                          background: on ? p.color : 'transparent',
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
