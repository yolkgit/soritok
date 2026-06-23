import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 300
const H = 440
const BLOCK_H = 28
const BASE_W = 180

export default function StackGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropRef = useRef<() => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!

    type Block = { x: number; w: number }
    let stack: Block[] = [{ x: (W - BASE_W) / 2, w: BASE_W }]
    let cur: Block = { x: 0, w: BASE_W }
    let dir = 1
    let speed = 2.2
    let score = 0
    let over = false
    let raf = 0
    // 카메라: 스택이 높아지면 위로 스크롤
    let camY = 0

    const hue = (i: number) => `hsl(${(i * 18 + 200) % 360} 70% 60%)`

    function topY(level: number) {
      // 0층(바닥)이 화면 아래쪽, 위로 쌓임. camY 적용.
      return H - 60 - level * BLOCK_H + camY
    }

    function spawn() {
      const prev = stack[stack.length - 1]
      cur = { x: dir > 0 ? -prev.w : W, w: prev.w }
    }
    spawn()

    function drop() {
      if (over) return
      const prev = stack[stack.length - 1]
      const left = Math.max(cur.x, prev.x)
      const right = Math.min(cur.x + cur.w, prev.x + prev.w)
      const overlap = right - left
      if (overlap <= 0) {
        over = true
        cancelAnimationFrame(raf)
        window.removeEventListener('keydown', onKey)
        draw()
        onGameOver(score)
        return
      }
      stack.push({ x: left, w: overlap })
      score++
      onScore(score)
      // 다음 블록은 잘린 폭으로
      dir = -dir
      speed = Math.min(6, speed + 0.12)
      // 카메라 목표 갱신은 loop 에서 부드럽게
      spawn()
    }
    dropRef.current = drop

    function draw() {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 쌓인 블록
      stack.forEach((b, i) => {
        const y = topY(i)
        if (y > H || y < -BLOCK_H) return
        ctx.fillStyle = hue(i)
        ctx.fillRect(b.x, y, b.w, BLOCK_H - 2)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillRect(b.x, y, b.w, 3)
      })
      // 현재 움직이는 블록
      const y = topY(stack.length)
      ctx.fillStyle = hue(stack.length)
      ctx.fillRect(cur.x, y, cur.w, BLOCK_H - 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(cur.x, y, cur.w, 3)
      // 점수
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 30px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(score), W / 2, 50)
    }

    function loop() {
      cur.x += dir * speed
      const prev = stack[stack.length - 1]
      // 좌우 경계에서 반사 (현재 블록은 화면 안에서 왕복)
      if (cur.x + cur.w > W && dir > 0) {
        cur.x = W - cur.w
        dir = -1
      } else if (cur.x < 0 && dir < 0) {
        cur.x = 0
        dir = 1
      }
      void prev
      // 카메라: 현재 블록이 화면 상단 1/3 위로 가지 않도록 따라 올림
      const desired = Math.max(0, (stack.length - 6) * BLOCK_H)
      camY += (desired - camY) * 0.1
      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        drop()
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

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        화면 탭 또는 스페이스로 블록을 정확히 쌓으세요. 삐져나온 부분은 잘려요!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={() => dropRef.current()}
        onTouchStart={(e) => {
          e.preventDefault()
          dropRef.current()
        }}
        style={{
          width: 'min(80vw, 300px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
