import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const COLS = 8
const D = 34
const R = 17
const W = COLS * D // 272
const H = 420
const ROWS = Math.floor(H / D)
const PALETTE = ['#ff6b6b', '#f5d23e', '#54e07c', '#36cfe6', '#c069f0']
const LOSE_ROW = ROWS - 2

export default function BubbleGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aimRef = useRef({ x: W / 2, y: 60 })
  const shootRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const SX = W / 2
    const SY = H - 22

    const grid: number[][] = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(-1))
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < COLS; c++) grid[r][c] = Math.floor(Math.random() * PALETTE.length)

    const cx = (c: number) => c * D + R
    const cy = (r: number) => r * D + R

    let cur = Math.floor(Math.random() * PALETTE.length)
    let nxt = Math.floor(Math.random() * PALETTE.length)
    let fly: { x: number; y: number; vx: number; vy: number; col: number } | null = null
    let shotsToDrop = 6
    let score = 0
    let over = false
    let raf = 0
    let last = performance.now()

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    function findEmpty(r0: number, c0: number): [number, number] | null {
      for (let rad = 0; rad < ROWS + COLS; rad++) {
        for (let dr = -rad; dr <= rad; dr++) {
          for (let dc = -rad; dc <= rad; dc++) {
            if (Math.abs(dr) + Math.abs(dc) !== rad) continue
            const r = r0 + dr
            const c = c0 + dc
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === -1) return [r, c]
          }
        }
      }
      return null
    }

    function cluster(r0: number, c0: number, color: number): [number, number][] {
      const seen = new Set<number>()
      const stack: [number, number][] = [[r0, c0]]
      const out: [number, number][] = []
      while (stack.length) {
        const [r, c] = stack.pop()!
        const key = r * COLS + c
        if (seen.has(key)) continue
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue
        if (grid[r][c] !== color) continue
        seen.add(key)
        out.push([r, c])
        stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1])
      }
      return out
    }

    function snap(x: number, y: number, color: number) {
      let r = Math.max(0, Math.round((y - R) / D))
      let c = Math.max(0, Math.min(COLS - 1, Math.round((x - R) / D)))
      if (r >= ROWS) r = ROWS - 1
      if (grid[r][c] !== -1) {
        const e = findEmpty(r, c)
        if (!e) return end()
        ;[r, c] = e
      }
      grid[r][c] = color
      const cl = cluster(r, c, color)
      if (cl.length >= 3) {
        for (const [rr, ccc] of cl) grid[rr][ccc] = -1
        score += cl.length * 10
        onScore(score)
      }
      // 패배 라인 체크
      for (let cc = 0; cc < COLS; cc++)
        for (let rr = LOSE_ROW; rr < ROWS; rr++) if (grid[rr][cc] !== -1) return end()
    }

    function dropRow() {
      // 아래로 한 칸씩 밀고 맨 위에 새 줄
      for (let r = ROWS - 1; r > 0; r--) grid[r] = grid[r - 1].slice()
      grid[0] = Array.from({ length: COLS }, () => Math.floor(Math.random() * PALETTE.length))
      for (let cc = 0; cc < COLS; cc++)
        for (let rr = LOSE_ROW; rr < ROWS; rr++) if (grid[rr][cc] !== -1) return end()
    }

    function shoot() {
      if (fly || over) return
      const a = aimRef.current
      let ang = Math.atan2(a.y - SY, a.x - SX)
      // 위쪽으로만 발사 (각도 제한)
      if (ang > -0.15) ang = -0.15
      if (ang < -Math.PI + 0.15) ang = -Math.PI + 0.15
      const sp = 560
      fly = { x: SX, y: SY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, col: cur }
      cur = nxt
      nxt = Math.floor(Math.random() * PALETTE.length)
      if (--shotsToDrop <= 0) {
        shotsToDrop = 6
        dropRow()
      }
    }
    shootRef.current = shoot

    function step(dt: number) {
      if (!fly) return
      fly.x += fly.vx * dt
      fly.y += fly.vy * dt
      if (fly.x < R) {
        fly.x = R
        fly.vx = Math.abs(fly.vx)
      } else if (fly.x > W - R) {
        fly.x = W - R
        fly.vx = -Math.abs(fly.vx)
      }
      if (fly.y <= R) {
        snap(fly.x, fly.y, fly.col)
        fly = null
        return
      }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === -1) continue
          const dx = fly.x - cx(c)
          const dy = fly.y - cy(r)
          if (dx * dx + dy * dy < (D - 3) * (D - 3)) {
            snap(fly.x, fly.y, fly.col)
            fly = null
            return
          }
        }
    }

    function bubble(x: number, y: number, color: number, rr = R) {
      ctx.fillStyle = PALETTE[color]
      ctx.beginPath()
      ctx.arc(x, y, rr - 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(x - rr / 3, y - rr / 3, rr / 3.4, 0, Math.PI * 2)
      ctx.fill()
    }

    function draw() {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 패배 라인
      ctx.strokeStyle = 'rgba(255,107,107,0.4)'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(0, LOSE_ROW * D)
      ctx.lineTo(W, LOSE_ROW * D)
      ctx.stroke()
      ctx.setLineDash([])
      // 그리드
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) if (grid[r][c] !== -1) bubble(cx(c), cy(r), grid[r][c])
      // 조준선
      const a = aimRef.current
      let ang = Math.atan2(a.y - SY, a.x - SX)
      if (ang > -0.15) ang = -0.15
      if (ang < -Math.PI + 0.15) ang = -Math.PI + 0.15
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(SX, SY)
      ctx.lineTo(SX + Math.cos(ang) * 90, SY + Math.sin(ang) * 90)
      ctx.stroke()
      ctx.setLineDash([])
      // 발사 중 버블
      if (fly) bubble(fly.x, fly.y, fly.col)
      // 발사대(현재/다음)
      bubble(SX, SY, cur)
      bubble(W - 16, H - 14, nxt, 11)
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      if (!over) step(dt)
      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const setAim = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      aimRef.current = {
        x: ((clientX - rect.left) / rect.width) * W,
        y: ((clientY - rect.top) / rect.height) * H,
      }
    }
    const onMove = (e: MouseEvent) => setAim(e.clientX, e.clientY)
    const onDown = (e: MouseEvent) => {
      setAim(e.clientX, e.clientY)
      shoot()
    }
    const onTouch = (e: TouchEvent) => setAim(e.touches[0].clientX, e.touches[0].clientY)
    const onTouchEnd = () => shoot()
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('touchstart', onTouch, { passive: true })
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        shoot()
      } else if (e.key === 'ArrowLeft') aimRef.current = { x: aimRef.current.x - 14, y: aimRef.current.y }
      else if (e.key === 'ArrowRight') aimRef.current = { x: aimRef.current.x + 14, y: aimRef.current.y }
    }
    window.addEventListener('keydown', onKey)

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        마우스·터치로 조준하고 클릭(스페이스)으로 발사! 같은 색 3개 이상을 터뜨리세요.
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(72vw, 272px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'crosshair',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
