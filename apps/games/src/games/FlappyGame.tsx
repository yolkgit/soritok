import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 320
const H = 440
const GAP = 140
const PIPE_W = 54
const SPEED = 2.3
const GRAV = 0.45
const FLAP = -7.2

export default function FlappyGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flapRef = useRef<() => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let birdY = H / 2
    let vy = 0
    let pipes: { x: number; top: number; passed: boolean }[] = []
    let score = 0
    let frame = 0
    let over = false
    let raf = 0

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

    function loop() {
      frame++
      vy += GRAV
      birdY += vy

      if (frame % 95 === 0) addPipe()
      pipes.forEach((p) => (p.x -= SPEED))
      pipes = pipes.filter((p) => p.x + PIPE_W > -10)

      // draw bg
      ctx.fillStyle = '#0f0a2e'
      ctx.fillRect(0, 0, W, H)

      // pipes + collision + score
      const bx = 80
      const br = 12
      for (const p of pipes) {
        ctx.fillStyle = '#5be07c'
        ctx.fillRect(p.x, 0, PIPE_W, p.top)
        ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP)
        // collision
        if (bx + br > p.x && bx - br < p.x + PIPE_W) {
          if (birdY - br < p.top || birdY + br > p.top + GAP) end()
        }
        if (!p.passed && p.x + PIPE_W < bx - br) {
          p.passed = true
          score++
          onScore(score)
        }
      }

      // bird
      ctx.fillStyle = '#f5d442'
      ctx.beginPath()
      ctx.arc(bx, birdY, br, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#222'
      ctx.beginPath()
      ctx.arc(bx + 4, birdY - 3, 2.5, 0, Math.PI * 2)
      ctx.fill()

      if (birdY + br > H || birdY - br < 0) {
        end()
        return
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
