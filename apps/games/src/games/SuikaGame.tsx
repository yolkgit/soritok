import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const W = 300
const H = 440
const TOPLINE = 76
const G = 1100
const STEP = 1 / 120

const TYPES = [
  { r: 13, c: '#ff6b6b', e: '🍒' },
  { r: 19, c: '#f5a347', e: '🍓' },
  { r: 26, c: '#f7d23e', e: '🍊' },
  { r: 34, c: '#9bd64a', e: '🍎' },
  { r: 43, c: '#54e07c', e: '🍈' },
  { r: 54, c: '#36cfe6', e: '🍉' },
]

type Body = { x: number; y: number; vx: number; vy: number; t: number; id: number }

export default function SuikaGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropXRef = useRef(W / 2)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let bodies: Body[] = []
    let nextId = 1
    let cur = Math.floor(Math.random() * 3)
    let cooldown = 0
    let score = 0
    let overTimer = 0
    let over = false
    let raf = 0
    let last = performance.now()
    let acc = 0

    const drop = () => {
      if (over || cooldown > 0) return
      const t = cur
      const r = TYPES[t].r
      const x = Math.max(r, Math.min(W - r, dropXRef.current))
      bodies.push({ x, y: 50, vx: 0, vy: 0, t, id: nextId++ })
      cur = Math.floor(Math.random() * 3)
      cooldown = 0.45
    }
    ;(canvas as unknown as { __drop?: () => void }).__drop = drop

    function physics() {
      for (const b of bodies) {
        b.vy += G * STEP
        b.x += b.vx * STEP
        b.y += b.vy * STEP
        const r = TYPES[b.t].r
        if (b.x < r) {
          b.x = r
          b.vx = Math.abs(b.vx) * 0.2
        } else if (b.x > W - r) {
          b.x = W - r
          b.vx = -Math.abs(b.vx) * 0.2
        }
        if (b.y > H - r) {
          b.y = H - r
          b.vy = -b.vy * 0.1
          b.vx *= 0.96
        }
      }

      // 병합 감지
      const mergedSet = new Set<number>()
      const newBodies: Body[] = []
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i]
          const b = bodies[j]
          if (mergedSet.has(a.id) || mergedSet.has(b.id)) continue
          if (a.t !== b.t || a.t >= TYPES.length - 1) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.hypot(dx, dy)
          if (d < TYPES[a.t].r + TYPES[b.t].r) {
            mergedSet.add(a.id)
            mergedSet.add(b.id)
            newBodies.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: 0, t: a.t + 1, id: nextId++ })
            score += (a.t + 1) * 2
            onScore(score)
            audio.tone(440 + a.t * 80, 0.12, 'triangle', 0.5)
          }
        }
      }
      if (mergedSet.size) {
        bodies = bodies.filter((b) => !mergedSet.has(b.id)).concat(newBodies)
      }

      // 위치 보정 (분리)
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i]
            const b = bodies[j]
            const ra = TYPES[a.t].r
            const rb = TYPES[b.t].r
            let dx = b.x - a.x
            let dy = b.y - a.y
            let d = Math.hypot(dx, dy)
            const min = ra + rb
            if (d < min) {
              if (d < 0.01) {
                dx = Math.random() - 0.5
                dy = -1
                d = 1
              }
              const nx = dx / d
              const ny = dy / d
              const push = (min - d) / 2
              a.x -= nx * push
              a.y -= ny * push
              b.x += nx * push
              b.y += ny * push
              const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
              if (rel < 0) {
                const imp = rel * 0.3
                a.vx += nx * imp
                a.vy += ny * imp
                b.vx -= nx * imp
                b.vy -= ny * imp
              }
            }
          }
        }
        // 벽 재구속
        for (const b of bodies) {
          const r = TYPES[b.t].r
          if (b.x < r) b.x = r
          else if (b.x > W - r) b.x = W - r
          if (b.y > H - r) b.y = H - r
        }
      }
    }

    function checkOver(dt: number) {
      let poking = false
      for (const b of bodies) {
        const r = TYPES[b.t].r
        if (b.y - r < TOPLINE && Math.hypot(b.vx, b.vy) < 26) poking = true
      }
      if (poking) {
        overTimer += dt
        if (overTimer > 1.3) {
          over = true
          cancelAnimationFrame(raf)
          detach()
          onGameOver(score)
        }
      } else overTimer = 0
    }

    function draw() {
      ctx.fillStyle = '#160f2e'
      ctx.fillRect(0, 0, W, H)
      // 경계선
      ctx.strokeStyle = 'rgba(255,107,107,0.45)'
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(0, TOPLINE)
      ctx.lineTo(W, TOPLINE)
      ctx.stroke()
      ctx.setLineDash([])
      // 다음 과일(드롭 대기)
      if (!over) {
        const r = TYPES[cur].r
        const x = Math.max(r, Math.min(W - r, dropXRef.current))
        ctx.globalAlpha = 0.5
        fruit(x, 44, cur)
        ctx.globalAlpha = 1
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.beginPath()
        ctx.moveTo(x, 60)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (const b of bodies) fruit(b.x, b.y, b.t)
    }

    function fruit(x: number, y: number, t: number) {
      const ty = TYPES[t]
      ctx.fillStyle = ty.c
      ctx.beginPath()
      ctx.arc(x, y, ty.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.arc(x - ty.r / 3, y - ty.r / 3, ty.r / 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = `${Math.round(ty.r * 1.1)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ty.e, x, y + 1)
    }

    function loop(now: number) {
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt)
      acc += dt
      let guard = 0
      while (acc >= STEP && guard < 20) {
        physics()
        acc -= STEP
        guard++
      }
      checkOver(dt)
      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const setX = (clientX: number) => {
      const r = canvas.getBoundingClientRect()
      dropXRef.current = ((clientX - r.left) / r.width) * W
    }
    const onMove = (e: MouseEvent) => setX(e.clientX)
    const onTouch = (e: TouchEvent) => setX(e.touches[0].clientX)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchstart', onTouch, { passive: true })
    function detach() {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchstart', onTouch)
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
        좌우로 움직여 같은 과일끼리 합치세요! 🍒→🍓→🍊→🍎→🍈→🍉 (선을 넘으면 끝)
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={() => (canvasRef.current as unknown as { __drop?: () => void }).__drop?.()}
        onTouchEnd={() => (canvasRef.current as unknown as { __drop?: () => void }).__drop?.()}
        style={{
          width: 'min(72vw, 300px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
