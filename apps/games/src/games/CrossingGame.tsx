import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const COLS = 9
const CELL = 36
const W = COLS * CELL // 324
const H = 432
const ROWS_VIS = Math.ceil(H / CELL)

type Lane = { road: boolean; dir: number; speed: number; cars: number[]; color: string }

export default function CrossingGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hopRef = useRef<(dx: number, dy: number) => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const CAR_COLORS = ['#ff6b6b', '#f5a347', '#36cfe6', '#c069f0']

    const lanes = new Map<number, Lane>()
    const laneAt = (row: number): Lane => {
      let l = lanes.get(row)
      if (!l) {
        const road = row > 0 && Math.random() < 0.62
        if (road) {
          const dir = Math.random() < 0.5 ? 1 : -1
          const speed = 50 + Math.random() * 90 + Math.min(120, row * 2)
          const n = 2 + Math.floor(Math.random() * 2)
          const cars: number[] = []
          const gap = W / n
          for (let i = 0; i < n; i++) cars.push(i * gap + Math.random() * gap * 0.5)
          l = { road, dir, speed, cars, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] }
        } else {
          l = { road: false, dir: 0, speed: 0, cars: [], color: '' }
        }
        lanes.set(row, l)
      }
      return l
    }

    let col = Math.floor(COLS / 2)
    let prow = 0 // 발판 행(정수)
    let px = col * CELL // 픽셀 위치(보간)
    let camY = 0 // 카메라가 따라가는 월드 y(행*CELL)
    let targetCol = col
    let targetRow = 0
    let maxRow = 0
    let score = 0
    let over = false
    let raf = 0
    let last = performance.now()

    const CAR_W = CELL + 6

    const hop = (dx: number, dy: number) => {
      if (over) return
      targetCol = Math.max(0, Math.min(COLS - 1, targetCol + dx))
      targetRow = Math.max(0, targetRow + dy)
    }
    hopRef.current = hop

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    // 월드 y: 행 r 의 화면 y = H - 60 - (r*CELL - camY)
    const rowScreenY = (r: number) => H - 60 - (r * CELL - camY)

    function step(dt: number) {
      // 플레이어 보간 이동
      const tx = targetCol * CELL
      const tyRow = targetRow
      px += (tx - px) * Math.min(1, dt * 16)
      prow += (tyRow - prow) * Math.min(1, dt * 16)
      col = targetCol

      // 카메라가 플레이어를 따라 위로
      const desiredCam = targetRow * CELL
      camY += (desiredCam - camY) * Math.min(1, dt * 6)

      if (targetRow > maxRow) {
        maxRow = targetRow
        score = maxRow
        onScore(score)
      }

      // 보이는 차선들 갱신 + 차 이동
      const baseRow = Math.floor(camY / CELL) - 1
      for (let i = -1; i < ROWS_VIS + 2; i++) {
        const r = baseRow + i
        if (r < 0) continue
        const lane = laneAt(r)
        if (lane.road) {
          for (let c = 0; c < lane.cars.length; c++) {
            lane.cars[c] += lane.dir * lane.speed * dt
            const span = W + CAR_W + 40
            if (lane.cars[c] > W + 20) lane.cars[c] -= span
            else if (lane.cars[c] < -CAR_W - 20) lane.cars[c] += span
          }
        }
      }

      // 충돌: 플레이어가 거의 안착한 행에서 차와 겹치면 사망
      const settled = Math.abs(prow - targetRow) < 0.3
      if (settled) {
        const lane = laneAt(targetRow)
        if (lane.road) {
          const pxl = col * CELL
          for (const cx of lane.cars) {
            if (pxl + CELL - 6 > cx && pxl + 6 < cx + CAR_W) return end()
          }
        }
      }
    }

    function draw() {
      const baseRow = Math.floor(camY / CELL) - 1
      for (let i = -1; i < ROWS_VIS + 2; i++) {
        const r = baseRow + i
        if (r < 0) continue
        const y = rowScreenY(r)
        const lane = laneAt(r)
        ctx.fillStyle = lane.road ? '#1b1730' : r === 0 ? '#243b22' : '#1e3320'
        ctx.fillRect(0, y - CELL, W, CELL)
        if (lane.road) {
          ctx.fillStyle = 'rgba(255,255,255,0.14)'
          for (let x = 4; x < W; x += 24) ctx.fillRect(x, y - CELL / 2 - 1, 12, 2)
          for (const cx of lane.cars) {
            ctx.fillStyle = lane.color
            ctx.beginPath()
            ctx.roundRect(cx, y - CELL + 5, CAR_W, CELL - 10, 6)
            ctx.fill()
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.fillRect(cx + (lane.dir > 0 ? CAR_W - 8 : 4), y - CELL + 9, 4, CELL - 18)
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          for (let x = 0; x < W; x += CELL) ctx.fillRect(x + 6, y - CELL + 8, 4, 4)
        }
      }
      // 플레이어
      const sy = H - 60 - (prow * CELL - camY)
      ctx.fillStyle = '#9bd64a'
      ctx.beginPath()
      ctx.roundRect(px + 5, sy - CELL + 5, CELL - 10, CELL - 10, 8)
      ctx.fill()
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(px + 12, sy - CELL + 13, 4, 4)
      ctx.fillRect(px + CELL - 16, sy - CELL + 13, 4, 4)
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      if (!over) step(dt)
      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        hop(0, 1)
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        hop(0, -1)
        e.preventDefault()
      } else if (e.key === 'ArrowLeft') {
        hop(-1, 0)
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        hop(1, 0)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  const dpad = (dx: number, dy: number, label: string, span = false): React.ReactNode => (
    <button
      onClick={() => hopRef.current(dx, dy)}
      style={{
        gridColumn: span ? '1 / 4' : undefined,
        padding: '12px 0',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: span ? 'rgba(155,214,74,0.25)' : 'rgba(255,255,255,0.12)',
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
        ↑로 길을 건너 계속 전진! 차에 부딪히지 않게 조심하세요.
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(82vw, 300px)',
          borderRadius: 12,
          touchAction: 'none',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, maxWidth: 240, marginInline: 'auto' }}>
        {dpad(0, 1, '▲ 전진', true)}
        {dpad(-1, 0, '◀')}
        {dpad(0, -1, '▼')}
        {dpad(1, 0, '▶')}
      </div>
    </div>
  )
}
