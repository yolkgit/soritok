import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const COLS = 20
const ROWS = 20
const CELL = 17

type P = { x: number; y: number }

export default function SnakeGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let snake: P[] = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ]
    let prev: P[] = snake.map((s) => ({ ...s }))
    let dir: P = { x: 1, y: 0 }
    let nextDir: P = { x: 1, y: 0 }
    let food: P = spawn()
    let score = 0
    let grew = false
    let over = false
    let raf = 0
    let step = 135 // ms per logical move
    let acc = 0
    let last = performance.now()

    function spawn(): P {
      while (true) {
        const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
        if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
      }
    }

    function setDir(nx: number, ny: number) {
      if (snake.length > 1 && dir.x === -nx && dir.y === -ny) return
      nextDir = { x: nx, y: ny }
    }

    function tick() {
      dir = nextDir
      prev = snake.map((s) => ({ ...s }))
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
      if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= COLS ||
        head.y >= ROWS ||
        snake.some((s) => s.x === head.x && s.y === head.y)
      ) {
        over = true
        cancelAnimationFrame(raf)
        detach()
        onGameOver(score)
        return
      }
      snake.unshift(head)
      grew = head.x === food.x && head.y === food.y
      if (grew) {
        score += 10
        onScore(score)
        audio.play('pop')
        food = spawn()
        if (step > 80) step = Math.max(80, step - 3)
      } else {
        snake.pop()
      }
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const px = (cx: number) => cx * CELL + CELL / 2

    function draw(t: number) {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // 격자
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      for (let i = 1; i < COLS; i++) {
        ctx.beginPath()
        ctx.moveTo(i * CELL, 0)
        ctx.lineTo(i * CELL, ROWS * CELL)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * CELL)
        ctx.lineTo(COLS * CELL, i * CELL)
        ctx.stroke()
      }
      // 먹이 (살짝 맥동)
      const pulse = 1 + Math.sin(performance.now() / 200) * 0.08
      ctx.fillStyle = '#ff5b6e'
      ctx.shadowColor = '#ff5b6e'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(px(food.x), px(food.y), (CELL / 2 - 1) * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // 보간된 부드러운 뱀
      const pts: P[] = []
      for (let i = 0; i < snake.length; i++) {
        let fx: number, fy: number
        if (grew) {
          fx = snake[i].x
          fy = snake[i].y
        } else if (i === 0) {
          fx = lerp(prev[0]?.x ?? snake[0].x, snake[0].x, t)
          fy = lerp(prev[0]?.y ?? snake[0].y, snake[0].y, t)
        } else {
          const from = prev[i] ?? snake[i]
          const to = prev[i - 1] ?? snake[i]
          fx = lerp(from.x, to.x, t)
          fy = lerp(from.y, to.y, t)
        }
        pts.push({ x: px(fx), y: px(fy) })
      }
      // 몸통 (두꺼운 둥근 선)
      ctx.strokeStyle = '#46c46a'
      ctx.lineWidth = CELL - 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      // 머리
      ctx.fillStyle = '#7CFF9B'
      ctx.beginPath()
      ctx.arc(pts[0].x, pts[0].y, CELL / 2, 0, Math.PI * 2)
      ctx.fill()
      // 눈
      ctx.fillStyle = '#0c0826'
      const ex = dir.x * 3
      const ey = dir.y * 3
      const perp = { x: -dir.y, y: dir.x }
      ctx.beginPath()
      ctx.arc(pts[0].x + ex + perp.x * 3, pts[0].y + ey + perp.y * 3, 2, 0, Math.PI * 2)
      ctx.arc(pts[0].x + ex - perp.x * 3, pts[0].y + ey - perp.y * 3, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    function loop(now: number) {
      const dt = now - last
      last = now
      acc += dt
      while (acc >= step && !over) {
        acc -= step
        tick()
      }
      if (over) return
      draw(Math.min(1, acc / step))
      raf = requestAnimationFrame(loop)
    }

    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      if (m[e.key]) {
        e.preventDefault()
        setDir(m[e.key][0], m[e.key][1])
      }
    }
    window.addEventListener('keydown', onKey)

    let touch: P | null = null
    const onTS = (e: TouchEvent) => (touch = { x: e.touches[0].clientX, y: e.touches[0].clientY })
    const onTE = (e: TouchEvent) => {
      if (!touch) return
      const dx = e.changedTouches[0].clientX - touch.x
      const dy = e.changedTouches[0].clientY - touch.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0)
      else setDir(0, dy > 0 ? 1 : -1)
      touch = null
    }
    canvas.addEventListener('touchstart', onTS, { passive: true })
    canvas.addEventListener('touchend', onTE)

    function detach() {
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('touchstart', onTS)
      canvas.removeEventListener('touchend', onTE)
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
        화살표 키 또는 스와이프로 먹이를 먹어 길어지세요. 벽·몸통에 닿으면 끝!
      </p>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        style={{
          width: 'min(90vw, 340px)',
          maxWidth: COLS * CELL,
          borderRadius: 12,
          touchAction: 'none',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
