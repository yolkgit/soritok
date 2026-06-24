import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const W = 300
const H = 420
const BR = 8
const GRAV = 620 // px/s^2

export default function PinballGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const leftRef = useRef(false)
  const rightRef = useRef(false)
  const [balls, setBalls] = useState(3)

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const bumpers = [
      { x: 90, y: 110, r: 22, c: '#ff6b6b' },
      { x: 210, y: 110, r: 22, c: '#36cfe6' },
      { x: 150, y: 180, r: 26, c: '#f7d23e' },
      { x: 60, y: 230, r: 18, c: '#54e07c' },
      { x: 240, y: 230, r: 18, c: '#c069f0' },
    ]
    let ball = { x: W - 20, y: H - 60, vx: 0, vy: 0 }
    let live = false
    let ballsLeft = 3
    let score = 0
    let over = false
    let raf = 0
    let last = performance.now()
    let leftAng = 0
    let rightAng = 0

    // 플리퍼 피벗
    const LF = { x: 96, y: H - 46 }
    const RF = { x: W - 96, y: H - 46 }
    const FLEN = 56

    const launch = () => {
      if (live || over) return
      ball = { x: W - 20, y: H - 90, vx: -90 - Math.random() * 40, vy: -540 }
      live = true
    }
    ;(canvasRef.current as unknown as { __launch?: () => void }).__launch = launch

    const loseBall = () => {
      live = false
      ballsLeft--
      setBalls(ballsLeft)
      if (ballsLeft <= 0) {
        over = true
        cancelAnimationFrame(raf)
        detach()
        onGameOver(score)
      } else {
        ball = { x: W - 20, y: H - 60, vx: 0, vy: 0 }
      }
    }

    function reflect(nx: number, ny: number, boost: number) {
      const dot = ball.vx * nx + ball.vy * ny
      ball.vx -= 2 * dot * nx
      ball.vy -= 2 * dot * ny
      ball.vx += nx * boost
      ball.vy += ny * boost
    }

    function flipperHit(pivot: { x: number; y: number }, dir: number, active: boolean) {
      // 플리퍼를 피벗→끝점 선분으로 근사, 공이 가까우면 위로 튕김
      const ang = active ? -0.5 * dir : 0.35 * dir
      const ex = pivot.x + Math.cos(ang) * FLEN * dir
      const ey = pivot.y + Math.sin(ang) * FLEN
      // 선분-점 거리
      const dx = ex - pivot.x
      const dy = ey - pivot.y
      const len2 = dx * dx + dy * dy
      let tt = ((ball.x - pivot.x) * dx + (ball.y - pivot.y) * dy) / len2
      tt = Math.max(0, Math.min(1, tt))
      const cxp = pivot.x + dx * tt
      const cyp = pivot.y + dy * tt
      const dist = Math.hypot(ball.x - cxp, ball.y - cyp)
      if (dist < BR + 6 && ball.vy > -50) {
        const nx = (ball.x - cxp) / (dist || 1)
        const ny = (ball.y - cyp) / (dist || 1)
        reflect(nx, ny, active ? 420 : 120)
        if (active) ball.vy = Math.min(ball.vy, -360)
        ball.x = cxp + nx * (BR + 7)
        ball.y = cyp + ny * (BR + 7)
      }
      return { ex, ey, ang }
    }

    function step(dt: number) {
      if (!live) return
      ball.vy += GRAV * dt
      ball.x += ball.vx * dt
      ball.y += ball.vy * dt

      // 벽
      if (ball.x < BR) {
        ball.x = BR
        ball.vx = Math.abs(ball.vx) * 0.9
      } else if (ball.x > W - BR) {
        ball.x = W - BR
        ball.vx = -Math.abs(ball.vx) * 0.9
      }
      if (ball.y < BR) {
        ball.y = BR
        ball.vy = Math.abs(ball.vy) * 0.9
      }
      // 하단 경사벽 (가운데 배수구로 유도)
      if (ball.y > H - 70 && ball.x < 70) {
        reflect(0.6, -0.8, 40)
      }
      if (ball.y > H - 70 && ball.x > W - 70) {
        reflect(-0.6, -0.8, 40)
      }

      // 범퍼
      for (const b of bumpers) {
        const d = Math.hypot(ball.x - b.x, ball.y - b.y)
        if (d < b.r + BR) {
          const nx = (ball.x - b.x) / (d || 1)
          const ny = (ball.y - b.y) / (d || 1)
          reflect(nx, ny, 240)
          ball.x = b.x + nx * (b.r + BR + 1)
          ball.y = b.y + ny * (b.r + BR + 1)
          score += 100
          onScore(score)
        }
      }

      // 속도 제한
      const sp = Math.hypot(ball.vx, ball.vy)
      if (sp > 900) {
        ball.vx = (ball.vx / sp) * 900
        ball.vy = (ball.vy / sp) * 900
      }
    }

    function draw() {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 하단 경사벽
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, H - 120)
      ctx.lineTo(64, H - 50)
      ctx.moveTo(W, H - 120)
      ctx.lineTo(W - 64, H - 50)
      ctx.stroke()
      // 범퍼
      for (const b of bumpers) {
        ctx.fillStyle = b.c
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        ctx.arc(b.x - b.r / 3, b.y - b.r / 3, b.r / 3, 0, Math.PI * 2)
        ctx.fill()
      }
      // 플리퍼
      const lf = flipperHit(LF, -1, leftRef.current)
      const rf = flipperHit(RF, 1, rightRef.current)
      leftAng = lf.ang
      rightAng = rf.ang
      ctx.strokeStyle = '#f5a347'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(LF.x, LF.y)
      ctx.lineTo(LF.x + Math.cos(leftAng) * FLEN * -1, LF.y + Math.sin(leftAng) * FLEN)
      ctx.moveTo(RF.x, RF.y)
      ctx.lineTo(RF.x + Math.cos(rightAng) * FLEN, RF.y + Math.sin(rightAng) * FLEN)
      ctx.stroke()
      // 공
      if (live) {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2)
        ctx.fill()
      } else if (!over) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = 'bold 15px Pretendard, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('탭 또는 스페이스로 발사 🚀', W / 2, H / 2)
      }
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      // 안정성 위해 2 서브스텝
      step(dt / 2)
      step(dt / 2)
      draw()
      if (live && ball.y > H + BR) loseBall()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') leftRef.current = true
      else if (e.key === 'ArrowRight' || e.key === 'd') rightRef.current = true
      else if (e.key === ' ') {
        e.preventDefault()
        launch()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') leftRef.current = false
      else if (e.key === 'ArrowRight' || e.key === 'd') rightRef.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    function detach() {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
    }
  }, [onScore, onGameOver])

  const press = (which: 'l' | 'r', down: boolean) => () => {
    if (which === 'l') leftRef.current = down
    else rightRef.current = down
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        ← → (또는 좌우 버튼)로 플리퍼를 쳐서 공을 띄우고 범퍼를 맞히세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px' }}>남은 공 {'🔘'.repeat(balls)}</div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={() => (canvasRef.current as unknown as { __launch?: () => void }).__launch?.()}
        onTouchStart={(e) => {
          e.preventDefault()
          ;(canvasRef.current as unknown as { __launch?: () => void }).__launch?.()
        }}
        style={{
          width: 'min(72vw, 300px)',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 12, maxWidth: 300, marginInline: 'auto' }}>
        <button
          onMouseDown={press('l', true)}
          onMouseUp={press('l', false)}
          onMouseLeave={press('l', false)}
          onTouchStart={(e) => {
            e.preventDefault()
            leftRef.current = true
          }}
          onTouchEnd={press('l', false)}
          style={flipBtn}
        >
          ◀ 왼쪽
        </button>
        <button
          onMouseDown={press('r', true)}
          onMouseUp={press('r', false)}
          onMouseLeave={press('r', false)}
          onTouchStart={(e) => {
            e.preventDefault()
            rightRef.current = true
          }}
          onTouchEnd={press('r', false)}
          style={flipBtn}
        >
          오른쪽 ▶
        </button>
      </div>
    </div>
  )
}

const flipBtn: React.CSSProperties = {
  flex: 1,
  padding: '14px 0',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(245,163,71,0.25)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
}
