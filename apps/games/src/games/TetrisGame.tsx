import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const COLS = 10
const ROWS = 20
const CELL = 18

type Cell = string | 0
type Matrix = number[][]

const PIECES: { m: Matrix; c: string }[] = [
  { m: [[1, 1, 1, 1]], c: '#4cd6e0' }, // I
  { m: [[1, 1], [1, 1]], c: '#f5d442' }, // O
  { m: [[0, 1, 0], [1, 1, 1]], c: '#b061e0' }, // T
  { m: [[0, 1, 1], [1, 1, 0]], c: '#5be07c' }, // S
  { m: [[1, 1, 0], [0, 1, 1]], c: '#f5605f' }, // Z
  { m: [[1, 0, 0], [1, 1, 1]], c: '#5b7cf0' }, // J
  { m: [[0, 0, 1], [1, 1, 1]], c: '#f5a142' }, // L
]

const rotateCW = (m: Matrix): Matrix => m[0].map((_, i) => m.map((row) => row[i]).reverse())

export default function TetrisGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const moveRef = useRef<(a: 'l' | 'r' | 'd' | 'rot' | 'drop') => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const well: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0))
    let piece = newPiece()
    let px = 0
    let py = 0
    let color = '#fff'
    let score = 0
    let over = false

    function newPiece() {
      const p = PIECES[Math.floor(Math.random() * PIECES.length)]
      color = p.c
      px = Math.floor((COLS - p.m[0].length) / 2)
      py = 0
      return p.m.map((r) => [...r])
    }

    function collide(m: Matrix, ox: number, oy: number): boolean {
      for (let y = 0; y < m.length; y++)
        for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue
          const nx = ox + x
          const ny = oy + y
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true
          if (ny >= 0 && well[ny][nx]) return true
        }
      return false
    }

    function lock() {
      piece.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v && py + y >= 0) well[py + y][px + x] = color
        }),
      )
      // 줄 제거
      let cleared = 0
      for (let y = ROWS - 1; y >= 0; y--) {
        if (well[y].every((c) => c !== 0)) {
          well.splice(y, 1)
          well.unshift(Array<Cell>(COLS).fill(0))
          cleared++
          y++
        }
      }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared]
        onScore(score)
      }
      piece = newPiece()
      if (collide(piece, px, py)) {
        over = true
        clearInterval(timer)
        window.removeEventListener('keydown', onKey)
        onGameOver(score)
      }
    }

    function step() {
      if (over) return
      if (!collide(piece, px, py + 1)) py++
      else lock()
      draw()
    }

    function act(a: 'l' | 'r' | 'd' | 'rot' | 'drop') {
      if (over) return
      if (a === 'l' && !collide(piece, px - 1, py)) px--
      else if (a === 'r' && !collide(piece, px + 1, py)) px++
      else if (a === 'd') step()
      else if (a === 'rot') {
        const rot = rotateCW(piece)
        if (!collide(rot, px, py)) piece = rot
        else if (!collide(rot, px - 1, py)) {
          px--
          piece = rot
        } else if (!collide(rot, px + 1, py)) {
          px++
          piece = rot
        }
      } else if (a === 'drop') {
        while (!collide(piece, px, py + 1)) py++
        lock()
      }
      draw()
    }
    moveRef.current = act

    function draw() {
      ctx.fillStyle = '#0f0a2e'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
      const cell = (x: number, y: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
      }
      well.forEach((row, y) => row.forEach((c, x) => c && cell(x, y, c)))
      piece.forEach((row, y) =>
        row.forEach((v, x) => v && py + y >= 0 && cell(px + x, py + y, color)),
      )
    }

    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, 'l' | 'r' | 'd' | 'rot' | 'drop'> = {
        ArrowLeft: 'l',
        ArrowRight: 'r',
        ArrowDown: 'd',
        ArrowUp: 'rot',
        ' ': 'drop',
      }
      if (m[e.key]) {
        e.preventDefault()
        act(m[e.key])
      }
    }
    window.addEventListener('keydown', onKey)

    draw()
    const timer = setInterval(step, 600)

    return () => {
      over = true
      clearInterval(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  const Btn = ({ a, label }: { a: 'l' | 'r' | 'd' | 'rot' | 'drop'; label: string }) => (
    <button
      onClick={() => moveRef.current(a)}
      style={{
        flex: 1,
        padding: '12px 0',
        borderRadius: 10,
        border: 'none',
        background: 'rgba(255,255,255,0.14)',
        color: '#fff',
        fontSize: 18,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        ← → 이동 · ↑ 회전 · ↓ 소프트드롭 · 스페이스 하드드롭
      </p>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        style={{
          width: 'min(56vw, 200px)',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 320, marginInline: 'auto' }}>
        <Btn a="l" label="◀" />
        <Btn a="rot" label="⟳" />
        <Btn a="r" label="▶" />
        <Btn a="d" label="▼" />
        <Btn a="drop" label="⤓" />
      </div>
    </div>
  )
}
