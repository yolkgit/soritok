import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 400
const H = 280
const PADW = 10
const PADH = 58
const BALL = 8

export default function PongGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const targetY = useRef(H / 2)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let py = H / 2 - PADH / 2
    let ay = H / 2 - PADH / 2
    let bx = W / 2
    let by = H / 2
    let speed = 250
    let vx = -speed
    let vy = 110
    let score = 0
    let over = false
    let raf = 0
    let last = performance.now()

    const reset = (dir: number) => {
      bx = W / 2
      by = H / 2
      const ang = Math.random() * 0.6 - 0.3
      vx = dir * speed * Math.cos(ang)
      vy = speed * Math.sin(ang)
    }
    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
      onGameOver(score)
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05

      py += (targetY.current - PADH / 2 - py) * Math.min(1, dt * 14)
      py = Math.max(0, Math.min(H - PADH, py))

      const aic = ay + PADH / 2
      const aiSpeed = 200
      if (by < aic - 6) ay -= aiSpeed * dt
      else if (by > aic + 6) ay += aiSpeed * dt
      ay = Math.max(0, Math.min(H - PADH, ay))

      bx += vx * dt
      by += vy * dt
      if (by < BALL) {
        by = BALL
        vy = Math.abs(vy)
      } else if (by > H - BALL) {
        by = H - BALL
        vy = -Math.abs(vy)
      }

      if (vx < 0 && bx - BALL < 6 + PADW && by > py && by < py + PADH) {
        bx = 6 + PADW + BALL
        vx = Math.abs(vx)
        vy += ((by - (py + PADH / 2)) / (PADH / 2)) * 140
        speed = Math.min(560, speed + 14)
        const m = Math.hypot(vx, vy)
        vx = (vx / m) * speed
        vy = (vy / m) * speed
      }
      if (vx > 0 && bx + BALL > W - 6 - PADW && by > ay && by < ay + PADH) {
        bx = W - 6 - PADW - BALL
        vx = -Math.abs(vx)
        vy += ((by - (ay + PADH / 2)) / (PADH / 2)) * 140
        const m = Math.hypot(vx, vy)
        vx = (vx / m) * speed
        vy = (vy / m) * speed
      }

      if (bx < -BALL) return end()
      if (bx > W + BALL) {
        score++
        onScore(score)
        reset(-1)
      }

      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.setLineDash([6, 8])
      ctx.beginPath()
      ctx.moveTo(W / 2, 0)
      ctx.lineTo(W / 2, H)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#54e07c'
      ctx.beginPath()
      ctx.roundRect(6, py, PADW, PADH, 4)
      ctx.fill()
      ctx.fillStyle = '#ff6b6b'
      ctx.beginPath()
      ctx.roundRect(W - 6 - PADW, ay, PADW, PADH, 4)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bx, by, BALL, 0, Math.PI * 2)
      ctx.fill()

      if (!over) raf = requestAnimationFrame(loop)
    }

    const setY = (clientY: number) => {
      const r = canvas.getBoundingClientRect()
      targetY.current = ((clientY - r.top) / r.height) * H
    }
    const onMove = (e: MouseEvent) => setY(e.clientY)
    const onTouch = (e: TouchEvent) => setY(e.touches[0].clientY)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchstart', onTouch, { passive: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        targetY.current -= 26
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        targetY.current += 26
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    function detach() {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchstart', onTouch)
      window.removeEventListener('keydown', onKey)
    }

    reset(-1)
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
        마우스·터치로 왼쪽 막대를 움직여 공을 받아치세요. 놓치면 끝!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(94vw, 400px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
