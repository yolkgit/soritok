import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 320
const H = 400
const PADDLE_W = 66
const PADDLE_H = 12
const BALL_R = 6
const COLS = 7
const ROWS = 5
const BRICK_H = 16
const GAP = 4
const TOP = 44

export default function BreakoutGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const targetX = useRef(W / 2)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const COLORS = ['#ff6b6b', '#f5a347', '#f7d23e', '#54e07c', '#36cfe6']
    const brickW = (W - GAP * (COLS + 1)) / COLS

    let bricks: { x: number; y: number; c: string; alive: boolean }[] = []
    const buildWall = () => {
      bricks = []
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({
            x: GAP + c * (brickW + GAP),
            y: TOP + r * (BRICK_H + GAP),
            c: COLORS[r % COLORS.length],
            alive: true,
          })
    }
    buildWall()

    let paddleX = W / 2
    let speed = 3.0
    let bx = W / 2
    let by = H - 60
    let vx = speed * 0.6
    let vy = -speed
    let score = 0
    let lives = 3
    let over = false
    let raf = 0

    const resetBall = () => {
      bx = paddleX
      by = H - 60
      vx = (Math.random() < 0.5 ? -1 : 1) * speed * 0.55
      vy = -Math.abs(speed)
    }

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
      onGameOver(score)
    }

    function loop() {
      // 패들 추적
      paddleX += (targetX.current - paddleX) * 0.35
      paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddleX))

      bx += vx
      by += vy
      if (bx < BALL_R) {
        bx = BALL_R
        vx = Math.abs(vx)
      } else if (bx > W - BALL_R) {
        bx = W - BALL_R
        vx = -Math.abs(vx)
      }
      if (by < BALL_R) {
        by = BALL_R
        vy = Math.abs(vy)
      }

      // 패들 충돌
      const py = H - PADDLE_H - 8
      if (vy > 0 && by + BALL_R >= py && by + BALL_R <= py + PADDLE_H + 6 && bx > paddleX - PADDLE_W / 2 && bx < paddleX + PADDLE_W / 2) {
        vy = -Math.abs(vy)
        vx += ((bx - paddleX) / (PADDLE_W / 2)) * 1.8
        const mag = Math.hypot(vx, vy)
        const want = speed
        vx = (vx / mag) * want
        vy = (vy / mag) * want
      }

      // 바닥
      if (by - BALL_R > H) {
        lives--
        if (lives <= 0) return end()
        resetBall()
      }

      // 벽돌 충돌
      let remaining = 0
      for (const b of bricks) {
        if (!b.alive) continue
        remaining++
        if (bx + BALL_R > b.x && bx - BALL_R < b.x + brickW && by + BALL_R > b.y && by - BALL_R < b.y + BRICK_H) {
          b.alive = false
          score += 10
          onScore(score)
          // 위/아래 vs 좌/우 판정
          const overlapX = Math.min(bx + BALL_R - b.x, b.x + brickW - (bx - BALL_R))
          const overlapY = Math.min(by + BALL_R - b.y, b.y + BRICK_H - (by - BALL_R))
          if (overlapY < overlapX) vy = -vy
          else vx = -vx
          break
        }
      }
      if (remaining === 0) {
        speed += 0.5
        buildWall()
        resetBall()
      }

      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    function draw() {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 벽돌
      for (const b of bricks) {
        if (!b.alive) continue
        ctx.fillStyle = b.c
        ctx.fillRect(b.x, b.y, brickW, BRICK_H)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(b.x, b.y, brickW, 3)
      }
      // 패들
      const grd = ctx.createLinearGradient(0, H - PADDLE_H - 8, 0, H - 8)
      grd.addColorStop(0, '#cfe8ff')
      grd.addColorStop(1, '#5b8cf0')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.roundRect(paddleX - PADDLE_W / 2, H - PADDLE_H - 8, PADDLE_W, PADDLE_H, 6)
      ctx.fill()
      // 공
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      // 라이프
      ctx.fillStyle = '#ff6b6b'
      for (let i = 0; i < lives; i++) {
        ctx.beginPath()
        ctx.arc(12 + i * 16, 16, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const setFromClient = (clientX: number) => {
      const rect = canvas.getBoundingClientRect()
      targetX.current = ((clientX - rect.left) / rect.width) * W
    }
    const onMove = (e: MouseEvent) => setFromClient(e.clientX)
    const onTouch = (e: TouchEvent) => {
      setFromClient(e.touches[0].clientX)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') targetX.current = Math.max(PADDLE_W / 2, targetX.current - 28)
      else if (e.key === 'ArrowRight') targetX.current = Math.min(W - PADDLE_W / 2, targetX.current + 28)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('keydown', onKey)
    function detach() {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchstart', onTouch)
      window.removeEventListener('keydown', onKey)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
    }
  }, [onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        마우스·터치로 패들을 움직여 공으로 벽돌을 깨세요. 공을 놓치면 생명이 줄어요!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
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
