import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const COLS = 20
const ROWS = 20
const CELL = 17

type P = { x: number; y: number }

export default function SnakeGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let snake: P[] = [{ x: 10, y: 10 }]
    let dir: P = { x: 1, y: 0 }
    let nextDir: P = { x: 1, y: 0 }
    let food: P = spawn()
    let score = 0

    function spawn(): P {
      while (true) {
        const p = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        }
        if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
      }
    }

    function setDir(nx: number, ny: number) {
      // 역방향 금지
      if (snake.length > 1 && dir.x === -nx && dir.y === -ny) return
      nextDir = { x: nx, y: ny }
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
    const onTS = (e: TouchEvent) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
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

    function draw() {
      ctx.fillStyle = '#0f0a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // food
      ctx.fillStyle = '#ff5b6e'
      ctx.beginPath()
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2)
      ctx.fill()
      // snake
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#7CFF9B' : '#46c46a'
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    function tick() {
      dir = nextDir
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
      if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= COLS ||
        head.y >= ROWS ||
        snake.some((s) => s.x === head.x && s.y === head.y)
      ) {
        clearInterval(timer)
        window.removeEventListener('keydown', onKey)
        onGameOver(score)
        return
      }
      snake.unshift(head)
      if (head.x === food.x && head.y === food.y) {
        score += 10
        onScore(score)
        food = spawn()
      } else {
        snake.pop()
      }
      draw()
    }

    draw()
    const timer = setInterval(tick, 110)

    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('touchstart', onTS)
      canvas.removeEventListener('touchend', onTE)
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
