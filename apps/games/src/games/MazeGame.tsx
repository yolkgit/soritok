import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const CANVAS = 320
const TIME = 60

function genMaze(C: number): boolean[][] {
  const W = 2 * C + 1
  const w: boolean[][] = Array.from({ length: W }, () => Array<boolean>(W).fill(true))
  const visited = Array.from({ length: C }, () => Array<boolean>(C).fill(false))
  const stack: [number, number][] = [[0, 0]]
  visited[0][0] = true
  w[1][1] = false
  const DIRS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const opts = DIRS.filter(([dr, dc]) => {
      const nr = r + dr
      const nc = c + dc
      return nr >= 0 && nr < C && nc >= 0 && nc < C && !visited[nr][nc]
    })
    if (!opts.length) {
      stack.pop()
      continue
    }
    const [dr, dc] = opts[Math.floor(Math.random() * opts.length)]
    const nr = r + dr
    const nc = c + dc
    visited[nr][nc] = true
    w[2 * r + 1 + dr][2 * c + 1 + dc] = false
    w[2 * nr + 1][2 * nc + 1] = false
    stack.push([nr, nc])
  }
  return w
}

export default function MazeGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const moveRef = useRef<(dr: number, dc: number) => void>(() => {})
  const [time, setTime] = useState(TIME)
  const [level, setLevel] = useState(1)

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let C = 7
    let maze = genMaze(C)
    let pr = 0
    let pc = 0
    let score = 0
    let lvl = 1
    let over = false

    const cellPx = () => CANVAS / (2 * C + 1)

    function draw() {
      const s = cellPx()
      ctx.fillStyle = '#160f2e'
      ctx.fillRect(0, 0, CANVAS, CANVAS)
      ctx.fillStyle = '#5b53a0'
      for (let y = 0; y < maze.length; y++)
        for (let x = 0; x < maze.length; x++) if (maze[y][x]) ctx.fillRect(x * s, y * s, s + 0.6, s + 0.6)
      // 출구
      const ex = (2 * (C - 1) + 1) * s + s / 2
      const ey = (2 * (C - 1) + 1) * s + s / 2
      ctx.fillStyle = '#54e07c'
      ctx.beginPath()
      ctx.arc(ex, ey, s * 0.34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.round(s * 0.6)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🚩', ex, ey + 1)
      // 플레이어
      const px = (2 * pc + 1) * s + s / 2
      const py = (2 * pr + 1) * s + s / 2
      ctx.fillStyle = '#f7d23e'
      ctx.beginPath()
      ctx.arc(px, py, s * 0.34, 0, Math.PI * 2)
      ctx.fill()
    }

    const move = (dr: number, dc: number) => {
      if (over) return
      const nr = pr + dr
      const nc = pc + dc
      if (nr < 0 || nr >= C || nc < 0 || nc >= C) return
      if (maze[2 * pr + 1 + dr][2 * pc + 1 + dc]) return // 벽
      pr = nr
      pc = nc
      if (pr === C - 1 && pc === C - 1) {
        score += 10
        onScore(score)
        audio.play('levelup')
        lvl++
        setLevel(lvl)
        C = Math.min(12, 6 + lvl)
        maze = genMaze(C)
        pr = 0
        pc = 0
      }
      draw()
    }
    moveRef.current = move

    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }
      if (m[e.key]) {
        e.preventDefault()
        move(m[e.key][0], m[e.key][1])
      }
    }
    window.addEventListener('keydown', onKey)

    const clock = setInterval(() => {
      setTime((s) => {
        if (s <= 1) {
          clearInterval(clock)
          over = true
          window.removeEventListener('keydown', onKey)
          setTimeout(() => onGameOver(score), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)

    // 스와이프
    const canvas = canvasRef.current!
    let touch: { x: number; y: number } | null = null
    const onTS = (e: TouchEvent) => (touch = { x: e.touches[0].clientX, y: e.touches[0].clientY })
    const onTE = (e: TouchEvent) => {
      if (!touch) return
      const dx = e.changedTouches[0].clientX - touch.x
      const dy = e.changedTouches[0].clientY - touch.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
      if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1)
      else move(dy > 0 ? 1 : -1, 0)
      touch = null
    }
    canvas.addEventListener('touchstart', onTS, { passive: true })
    canvas.addEventListener('touchend', onTE)

    draw()
    return () => {
      over = true
      clearInterval(clock)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('touchstart', onTS)
      canvas.removeEventListener('touchend', onTE)
    }
  }, [onScore, onGameOver])

  const press = (dr: number, dc: number) => () => moveRef.current(dr, dc)
  const bs: React.CSSProperties = {
    padding: '12px 0',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        화살표·스와이프로 🚩 출구까지! 60초 안에 많이 탈출하세요.
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>
        레벨 <b style={{ color: '#f7d23e' }}>{level}</b> · 남은 시간{' '}
        <b style={{ color: time <= 10 ? '#ff6b6b' : '#54e07c' }}>{time}s</b>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS}
        height={CANVAS}
        style={{
          width: 'min(86vw, 320px)',
          borderRadius: 12,
          touchAction: 'none',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, maxWidth: 220, marginInline: 'auto' }}>
        <span />
        <button style={bs} onClick={press(-1, 0)}>
          ▲
        </button>
        <span />
        <button style={bs} onClick={press(0, -1)}>
          ◀
        </button>
        <button style={bs} onClick={press(1, 0)}>
          ▼
        </button>
        <button style={bs} onClick={press(0, 1)}>
          ▶
        </button>
      </div>
    </div>
  )
}
