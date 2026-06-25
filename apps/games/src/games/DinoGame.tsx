import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const W = 440
const H = 180
const GROUND = 150
const DINO_X = 46
const DINO_W = 22
const DINO_H = 26
const GRAV = 0.7
const JUMP = -11

export default function DinoGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const jumpRef = useRef<() => void>(() => {})

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let y = GROUND - DINO_H
    let vy = 0
    let onGround = true
    let speed = 5
    let dist = 0
    let score = 0
    let over = false
    let raf = 0
    let legPhase = 0
    let last = performance.now()

    type Obs = { x: number; w: number; h: number; bird: boolean; y: number }
    let obstacles: Obs[] = []
    let nextSpawn = 40

    const jump = () => {
      if (over) return
      if (onGround) {
        vy = JUMP
        onGround = false
        audio.play('jump')
      }
    }
    jumpRef.current = jump

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    function spawnObstacle() {
      const bird = Math.random() < 0.25 && score > 5
      if (bird) {
        obstacles.push({ x: W + 10, w: 22, h: 18, bird: true, y: GROUND - 46 })
      } else {
        const h = 20 + Math.floor(Math.random() * 22)
        const w = 12 + Math.floor(Math.random() * 12)
        obstacles.push({ x: W + 10, w, h, bird: false, y: GROUND - h })
      }
      nextSpawn = Math.max(38, 90 - score) + Math.floor(Math.random() * 50)
    }

    function loop(now: number) {
      let dtf = (now - last) / 16.667
      last = now
      if (dtf > 2.5) dtf = 2.5

      dist += speed * dtf
      const ns = Math.floor(dist / 24)
      if (ns !== score) {
        score = ns
        onScore(score)
      }
      speed += 0.0025 * dtf

      vy += GRAV * dtf
      y += vy * dtf
      if (y >= GROUND - DINO_H) {
        y = GROUND - DINO_H
        vy = 0
        onGround = true
      }

      nextSpawn -= dtf
      if (nextSpawn <= 0) spawnObstacle()
      obstacles.forEach((o) => (o.x -= speed * dtf))
      obstacles = obstacles.filter((o) => o.x + o.w > -5)

      // 충돌 (약간 너그럽게)
      const dx = DINO_X + 3
      const dw = DINO_W - 6
      for (const o of obstacles) {
        if (dx + dw > o.x && dx < o.x + o.w && y + DINO_H > o.y + 3 && y < o.y + o.h) {
          return end()
        }
      }

      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    function draw() {
      // 하늘
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 별
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let i = 0; i < 6; i++) {
        const sx = (i * 90 - (dist * 0.2) % (W + 90) + W + 90) % (W + 90)
        ctx.fillRect(sx, 20 + ((i * 37) % 60), 2, 2)
      }
      // 땅
      ctx.strokeStyle = '#5b8cf0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, GROUND)
      ctx.lineTo(W, GROUND)
      ctx.stroke()
      // 땅 무늬 (스크롤)
      ctx.fillStyle = 'rgba(91,140,240,0.5)'
      for (let i = 0; i < 12; i++) {
        const gx = (i * 46 - (dist % 46))
        ctx.fillRect(gx, GROUND + 6, 16, 2)
      }

      // 장애물
      for (const o of obstacles) {
        if (o.bird) {
          legPhase = Math.floor(dist / 8) % 2
          ctx.fillStyle = '#f5a347'
          ctx.beginPath()
          ctx.moveTo(o.x, o.y + o.h / 2)
          ctx.lineTo(o.x + o.w, o.y + o.h / 2)
          ctx.lineTo(o.x + o.w / 2, o.y + (legPhase ? -2 : o.h))
          ctx.fill()
        } else {
          ctx.fillStyle = '#54e07c'
          ctx.fillRect(o.x, o.y, o.w, o.h)
          ctx.fillRect(o.x - 4, o.y + o.h * 0.4, 4, 4)
          ctx.fillRect(o.x + o.w, o.y + o.h * 0.25, 4, 4)
        }
      }

      // 디노
      ctx.fillStyle = '#9bd64a'
      ctx.fillRect(DINO_X, y, DINO_W, DINO_H)
      // 머리/꼬리 느낌
      ctx.fillRect(DINO_X + DINO_W - 6, y - 6, 8, 8)
      // 눈
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(DINO_X + DINO_W - 2, y - 4, 2, 2)
      // 다리 (달리는 애니메이션)
      if (onGround) {
        const lp = Math.floor(dist / 8) % 2
        ctx.fillStyle = '#9bd64a'
        ctx.fillRect(DINO_X + 3, y + DINO_H, 5, lp ? 5 : 2)
        ctx.fillRect(DINO_X + DINO_W - 9, y + DINO_H, 5, lp ? 2 : 5)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener('keydown', onKey)

    draw()
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
        스페이스·↑·탭으로 점프해 장애물을 피하세요. 갈수록 빨라져요!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={() => jumpRef.current()}
        onTouchStart={(e) => {
          e.preventDefault()
          jumpRef.current()
        }}
        style={{
          width: 'min(94vw, 440px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
