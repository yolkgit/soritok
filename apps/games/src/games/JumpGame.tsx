import { useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const W = 320
const H = 460
const PW = 34
const PH = 30
const GRAV = 1500 // px/s^2
const JUMP = -660 // px/s
const MOVE = 340 // px/s
const PLAT_W = 58

export default function JumpGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dirRef = useRef(0)
  const touchXRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let px = W / 2 - PW / 2
    let py = H - 90
    let vy = JUMP
    let face = 1
    let platforms: { x: number; y: number }[] = []
    let score = 0
    let climbed = 0
    let over = false
    let raf = 0
    let last = performance.now()

    const addPlatform = (y: number) => platforms.push({ x: Math.random() * (W - PLAT_W), y })
    platforms.push({ x: W / 2 - PLAT_W / 2, y: H - 40 })
    for (let y = H - 110; y > -20; y -= 60) addPlatform(y + (Math.random() * 16 - 8))

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
      onGameOver(score)
    }

    function step(dt: number) {
      let target = dirRef.current
      if (touchXRef.current != null) {
        const diff = touchXRef.current - (px + PW / 2)
        target = Math.max(-1, Math.min(1, diff / 36))
      }
      if (target !== 0) face = target > 0 ? 1 : -1
      px += target * MOVE * dt
      if (px < -PW) px = W
      else if (px > W) px = -PW

      const prevBottom = py + PH
      vy += GRAV * dt
      py += vy * dt

      if (vy > 0) {
        const newBottom = py + PH
        for (const pf of platforms) {
          if (
            px + PW > pf.x &&
            px < pf.x + PLAT_W &&
            prevBottom <= pf.y + 6 &&
            newBottom >= pf.y
          ) {
            py = pf.y - PH
            vy = JUMP
            break
          }
        }
      }

      // 카메라: 위로 오르면 월드를 아래로 밀고 점수 증가
      if (py < H * 0.42) {
        const shift = H * 0.42 - py
        py = H * 0.42
        climbed += shift
        platforms.forEach((p) => (p.y += shift))
        score = Math.floor(climbed / 10)
        onScore(score)
        platforms = platforms.filter((p) => p.y < H + 16)
        while (platforms.length < 9) {
          let topY = H
          for (const p of platforms) topY = Math.min(topY, p.y)
          addPlatform(topY - (48 + Math.random() * 30))
        }
      }

      if (py > H + 16) end()
    }

    function draw() {
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      for (const pf of platforms) {
        ctx.fillStyle = '#54e07c'
        ctx.beginPath()
        ctx.roundRect(pf.x, pf.y, PLAT_W, 12, 6)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(pf.x, pf.y, PLAT_W, 3)
      }
      // 캐릭터
      ctx.fillStyle = '#f7d23e'
      ctx.beginPath()
      ctx.roundRect(px, py, PW, PH, 9)
      ctx.fill()
      ctx.fillStyle = '#0c0826'
      const ex = face > 0 ? px + PW - 13 : px + 8
      ctx.fillRect(ex, py + 9, 5, 5)
      ctx.fillRect(ex + (face > 0 ? -8 : 8), py + 9, 5, 5)
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05
      if (!over) step(dt)
      draw()
      if (!over) raf = requestAnimationFrame(loop)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        dirRef.current = -1
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        dirRef.current = 1
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowLeft' && dirRef.current < 0) || (e.key === 'ArrowRight' && dirRef.current > 0))
        dirRef.current = 0
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    const setTouch = (clientX: number) => {
      const r = canvas.getBoundingClientRect()
      touchXRef.current = ((clientX - r.left) / r.width) * W
    }
    const onTS = (e: TouchEvent) => setTouch(e.touches[0].clientX)
    const onTE = () => (touchXRef.current = null)
    canvas.addEventListener('touchstart', onTS, { passive: true })
    canvas.addEventListener('touchmove', onTS, { passive: true })
    canvas.addEventListener('touchend', onTE)

    function detach() {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('touchstart', onTS)
      canvas.removeEventListener('touchmove', onTS)
      canvas.removeEventListener('touchend', onTE)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      detach()
    }
  }, [onScore, onGameOver])

  const hold = (d: number) => ({
    onMouseDown: () => (dirRef.current = d),
    onMouseUp: () => (dirRef.current = 0),
    onMouseLeave: () => (dirRef.current = 0),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault()
      dirRef.current = d
    },
    onTouchEnd: () => (dirRef.current = 0),
  })
  const btn: React.CSSProperties = {
    flex: 1,
    padding: '14px 0',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        ← → 또는 터치로 좌우 이동, 발판을 밟고 계속 위로 올라가세요!
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(80vw, 300px)',
          borderRadius: 12,
          touchAction: 'none',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 300, marginInline: 'auto' }}>
        <button style={btn} {...hold(-1)}>
          ◀
        </button>
        <button style={btn} {...hold(1)}>
          ▶
        </button>
      </div>
    </div>
  )
}
