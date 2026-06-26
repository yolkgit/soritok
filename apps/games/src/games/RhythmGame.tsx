import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const LANES = 4
const W = 320
const H = 420
const HITY = H - 56
const TOPY = -24
const COLORS = ['#ff6b6b', '#f7d23e', '#54e07c', '#36cfe6']
const KEYS = ['d', 'f', 'j', 'k']
const LANE_FREQ = [523.25, 587.33, 659.25, 783.99] // C5 D5 E5 G5

const BPM = 132
const SPB = 60 / BPM // 4분음표
const STEP = SPB / 2 // 8분음표 그리드
const FALL = 1.7 // 노트가 위→판정선까지 떨어지는 시간(초)
const HIT_GOOD = 0.16
const HIT_PERFECT = 0.055
const MAX_LIVES = 5

// 16스텝(2마디) 패턴 — 각 스텝의 노트 레인들
const PATTERN: number[][] = [
  [0], [], [2], [1], [3], [], [2], [0],
  [1], [], [3], [2], [0], [], [1], [2],
]
const KICK = new Set([0, 4, 8, 12])
const SNARE = new Set([2, 6, 10, 14])
const BASS: Record<number, number> = { 0: 130.81, 4: 130.81, 8: 164.81, 12: 196.0 } // C C E G

export default function RhythmGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<(lane: number) => void>(() => {})
  const [lives, setLives] = useState(MAX_LIVES)
  const [combo, setCombo] = useState(0)
  const [judge, setJudge] = useState('')

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const laneW = W / LANES
    audio.unlock()

    type Note = { lane: number; time: number; hit: boolean }
    let notes: Note[] = []
    let score = 0
    let livesN = MAX_LIVES
    let comboN = 0
    const flash = [0, 0, 0, 0]
    let over = false
    let raf = 0
    let scheduler = 0
    let nextStep = 0
    const nowSec = () => performance.now() / 1000 // 시각 마스터 클락(항상 진행)
    const startTime = nowSec() + FALL + 0.5 // 첫 노트가 떨어질 충분한 리드인

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      clearInterval(scheduler)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    // 룩어헤드: 곡(드럼/베이스/멜로디) 예약 + 떨어지는 노트 생성
    const scheduleAhead = () => {
      const now = nowSec()
      const acNow = audio.acTime // 오디오 클락 기준점(예약 순간)
      while (true) {
        const t = startTime + nextStep * STEP // 시각(perf) 기준 시각
        if (t > now + FALL + 0.3) break
        const when = acNow + (t - now) // 절대 오디오 시간으로 변환해 예약
        const s = nextStep % PATTERN.length
        audio.drum('hat', when, s % 2 ? 1 : 0.55)
        if (KICK.has(s)) audio.drum('kick', when)
        if (SNARE.has(s)) audio.drum('snare', when)
        if (BASS[s]) audio.songNote(BASS[s], when, 0.34, 'sine', 0.5)
        // 멜로디 = 게임플레이 노트 (놓쳐도 곡은 흐름)
        for (const lane of PATTERN[s]) {
          audio.songNote(LANE_FREQ[lane], when, 0.22, 'triangle', 0.28)
          notes.push({ lane, time: t, hit: false })
        }
        nextStep++
      }
    }

    const hit = (lane: number) => {
      if (over) return
      flash[lane] = 0.28
      const now = nowSec()
      let best: Note | null = null
      let bd = 1e9
      for (const n of notes) {
        if (n.lane !== lane || n.hit) continue
        const d = Math.abs(n.time - now)
        if (d < bd) {
          bd = d
          best = n
        }
      }
      if (best && bd < HIT_GOOD) {
        best.hit = true
        const perfect = bd < HIT_PERFECT
        score += perfect ? 100 : 55
        comboN++
        if (comboN > 1 && comboN % 5 === 0) score += comboN
        onScore(score)
        setCombo(comboN)
        setJudge(perfect ? 'PERFECT!' : 'GOOD')
        setTimeout(() => setJudge(''), 300)
        audio.tone(LANE_FREQ[lane] * 2, 0.1, 'square', perfect ? 0.5 : 0.34)
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

    function loop() {
      const now = nowSec()
      // 놓친 노트
      const missed = notes.filter((n) => !n.hit && now - n.time > HIT_GOOD)
      if (missed.length) {
        livesN -= missed.length
        comboN = 0
        setLives(Math.max(0, livesN))
        setCombo(0)
        for (const m of missed) m.hit = true
      }
      notes = notes.filter((n) => !(n.hit && now - n.time > 0.12) && now - n.time < 0.5)
      if (livesN <= 0) return end()

      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)'
        ctx.fillRect(i * laneW, 0, laneW, H)
        if (flash[i] > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flash[i]})`
          ctx.fillRect(i * laneW, HITY - 28, laneW, 56)
          flash[i] = Math.max(0, flash[i] - 0.05)
        }
        // 리셉터
        ctx.strokeStyle = COLORS[i]
        ctx.globalAlpha = 0.6
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(i * laneW + 8, HITY - 14, laneW - 16, 28, 8)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, HITY)
      ctx.lineTo(W, HITY)
      ctx.stroke()
      // 노트
      for (const n of notes) {
        if (n.hit) continue
        const prog = (now - (n.time - FALL)) / FALL // 0(위)→1(판정선)
        const y = TOPY + prog * (HITY - TOPY)
        ctx.fillStyle = COLORS[n.lane]
        ctx.beginPath()
        ctx.roundRect(n.lane * laneW + 6, y - 12, laneW - 12, 24, 8)
        ctx.fill()
      }

      if (!over) raf = requestAnimationFrame(loop)
    }

    scheduleAhead()
    scheduler = window.setInterval(scheduleAhead, 40)
    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      clearInterval(scheduler)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        곡 박자에 맞춰 노트가 선에 닿을 때 D F J K(또는 아래 버튼)를 누르세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px' }}>
        {'❤️'.repeat(lives)}
        {'🖤'.repeat(Math.max(0, MAX_LIVES - lives))}
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
