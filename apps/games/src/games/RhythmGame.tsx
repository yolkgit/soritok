import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const LANES = 4
const W = 320
const H = 420
const HITY = H - 56
const COLORS = ['#ff6b6b', '#f7d23e', '#54e07c', '#36cfe6']
const KEYS = ['d', 'f', 'j', 'k']

export default function RhythmGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<(lane: number) => void>(() => {})
  const [lives, setLives] = useState(3)
  const [combo, setCombo] = useState(0)
  const [judge, setJudge] = useState('')

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const laneW = W / LANES
    type Note = { lane: number; y: number; hit: boolean }
    let notes: Note[] = []
    let speed = 190 // px/s
    let spawnGap = 0.85
    let spawnT = 0
    let score = 0
    let livesN = 3
    let comboN = 0
    let flash = [0, 0, 0, 0]
    let over = false
    let raf = 0
    let last = performance.now()

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    const hit = (lane: number) => {
      if (over) return
      flash[lane] = 0.25
      // 히트라인에 가장 가까운 미처리 노트
      let best: Note | null = null
      let bestD = 1e9
      for (const n of notes) {
        if (n.lane !== lane || n.hit) continue
        const d = Math.abs(n.y - HITY)
        if (d < bestD) {
          bestD = d
          best = n
        }
      }
      if (best && bestD < 46) {
        best.hit = true
        const perfect = bestD < 18
        audio.tone(perfect ? 880 : 660, 0.09, 'square', 0.45)
        score += perfect ? 100 : 60
        comboN++
        if (comboN > 1 && comboN % 5 === 0) score += comboN
        onScore(score)
        setCombo(comboN)
        setJudge(perfect ? 'PERFECT!' : 'GOOD')
        setTimeout(() => setJudge(''), 350)
      } else {
        comboN = 0
        setCombo(0)
      }
    }
    hitRef.current = hit

    const onKey = (e: KeyboardEvent) => {
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0) {
        e.preventDefault()
        hit(i)
      }
    }
    window.addEventListener('keydown', onKey)

    function loop(now: number) {
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05

      spawnT += dt
      if (spawnT >= spawnGap) {
        spawnT = 0
        notes.push({ lane: Math.floor(Math.random() * LANES), y: -20, hit: false })
        spawnGap = Math.max(0.4, spawnGap - 0.006)
        speed = Math.min(360, speed + 1.2)
      }
      for (const n of notes) n.y += speed * dt
      // 놓친 노트 (히트라인 지나침)
      const missed = notes.filter((n) => !n.hit && n.y > HITY + 46)
      if (missed.length) {
        livesN -= missed.length
        comboN = 0
        setLives(Math.max(0, livesN))
        setCombo(0)
      }
      notes = notes.filter((n) => !(n.y > H + 20) && !(n.hit && n.y > HITY + 10))
      if (livesN <= 0) return end()

      // draw
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)'
        ctx.fillRect(i * laneW, 0, laneW, H)
        if (flash[i] > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flash[i]})`
          ctx.fillRect(i * laneW, HITY - 30, laneW, 60)
          flash[i] = Math.max(0, flash[i] - dt * 1.2)
        }
      }
      // 히트라인
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, HITY)
      ctx.lineTo(W, HITY)
      ctx.stroke()
      // 노트
      for (const n of notes) {
        if (n.hit) continue
        ctx.fillStyle = COLORS[n.lane]
        ctx.beginPath()
        ctx.roundRect(n.lane * laneW + 6, n.y - 12, laneW - 12, 24, 8)
        ctx.fill()
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
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        노트가 선에 닿을 때 D F J K (또는 아래 버튼)를 눌러 박자를 맞추세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px' }}>
        {'❤️'.repeat(lives)}
        {'🖤'.repeat(Math.max(0, 3 - lives))}
        <span style={{ marginLeft: 12, color: '#f7d23e' }}>{combo > 1 ? `${combo} COMBO` : ''}</span>
        <span style={{ marginLeft: 10, color: '#54e07c' }}>{judge}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(80vw, 320px)',
          borderRadius: 12,
          touchAction: 'none',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LANES}, 1fr)`, gap: 8, marginTop: 12, width: 'min(80vw, 320px)', marginInline: 'auto' }}>
        {COLORS.map((c, i) => (
          <button
            key={i}
            onMouseDown={() => hitRef.current(i)}
            onTouchStart={(e) => {
              e.preventDefault()
              hitRef.current(i)
            }}
            style={{
              padding: '16px 0',
              borderRadius: 12,
              border: 'none',
              background: c,
              color: '#1b1140',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {KEYS[i].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
