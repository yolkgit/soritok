import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 320
const H = 440
const GAP = 140
const PIPE_W = 54
const SPEED = 150 // px/s
const GRAV = 1700 // px/s^2
const FLAP = -430 // px/s
const SPAWN = 1.5 // s

export default function FlappyGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flapRef = useRef<() => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let birdY = H / 2
    let vy = 0
    let pipes: { x: number; top: number; passed: boolean }[] = []
    let score = 0
    let spawnT = 0
    let over = false
    let raf = 0
    let last = performance.now()

    const addPipe = () => {
      const top = 50 + Math.random() * (H - GAP - 120)
      pipes.push({ x: W, top, passed: false })
    }
    addPipe()

    const flap = () => {
      if (over) return
      vy = FLAP
    }
    flapRef.current = flap

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        flap()
      }
    }
    window.addEventListener('keydown', onKey)

    function end() {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    function loop(now: number) {
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05

      vy += GRAV * dt
      birdY += vy * dt

      spawnT += dt
      if (spawnT >= SPAWN) {
        spawnT = 0
        addPipe()
      }
      pipes.forEach((p) => (p.x -= SPEED * dt))
      pipes = pipes.filter((p) => p.x + PIPE_W > -10)

      ctx.fillStyle = '#0f0a2e'
      ctx.fillRect(0, 0, W, H)

      const bx = 80
      const br = 12
      for (const p of pipes) {
        const grd = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0)
        grd.addColorStop(0, '#54e07c')
        grd.addColorStop(1, '#2e9c52')
        ctx.fillStyle = grd
        ctx.fillRect(p.x, 0, PIPE_W, p.top)
        ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP)
        // 파이프 캡
        ctx.fillStyle = '#46c46a'
        ctx.fillRect(p.x - 3, p.top - 14, PIPE_W + 6, 14)
        ctx.fillRect(p.x - 3, p.top + GAP, PIPE_W + 6, 14)
        if (bx + br > p.x && bx - br < p.x + PIPE_W) {
          if (birdY - br < p.top || birdY + br > p.top + GAP) end()
        }
        if (!p.passed && p.x + PIPE_W < bx - br) {
          p.passed = true
          score++
          onScore(score)
        }
      }

      // 새 (속도에 따라 기울기)
      const angle = Math.max(-0.5, Math.min(1.4, vy / 500))
      ctx.save()
      ctx.translate(bx, birdY)
      ctx.rotate(angle)
      ctx.fillStyle = '#f5d442'
      ctx.beginPath()
      ctx.arc(0, 0, br, 0, Math.PI * 2)
      ctx.fill()
      // 날개
      ctx.fillStyle = '#e0b91f'
      ctx.beginPath()
      ctx.ellipse(-3, 2, 7, 4, -0.3, 0, Math.PI * 2)
      ctx.fill()
      // 부리
      ctx.fillStyle = '#f5874f'
      ctx.beginPath()
      ctx.moveTo(br - 2, -2)
      ctx.lineTo(br + 6, 1)
      ctx.lineTo(br - 2, 4)
      ctx.fill()
      // 눈
      ctx.fillStyle = '#222'
      ctx.beginPath()
      ctx.arc(5, -4, 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (birdY + br > H || birdY - br < 0) {
        return end()
      }
      if (!over) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        화면 탭 또는 스페이스로 날아올라 파이프를 통과하세요!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={() => flapRef.current()}
        onTouchStart={(e) => {
          e.preventDefault()
          flapRef.current()
        }}
        style={{
          width: 'min(86vw, 320px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
