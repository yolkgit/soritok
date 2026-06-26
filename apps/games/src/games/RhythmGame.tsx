import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'
import { SONGS, type Song } from '../data/songs'
import { getLocalBest } from '../lib/scores'

const LANES = 4
const W = 320
const H = 440
const HITY = H - 60
const TOPY = -24
const COLORS = ['#ff6b6b', '#f7d23e', '#54e07c', '#36cfe6']
const KEYS = ['d', 'f', 'j', 'k']
const FALL = 1.55 // 노트가 위→판정선까지 떨어지는 시간(초)
const HIT_GOOD = 0.155
const HIT_PERFECT = 0.05

// ── 곡 선택 화면 ──
function SongSelect({ onPick }: { onPick: (s: Song) => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <p style={{ opacity: 0.75, fontSize: 13, textAlign: 'center', margin: '0 0 14px' }}>
        곡을 골라 박자에 맞춰 D F J K 로 노트를 치고 최고 기록에 도전하세요! 🎵
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SONGS.map((s) => {
          const best = getLocalBest(`rhythm::${s.id}`)
          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                border: `1px solid ${s.color}55`,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '14px 16px',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: 26 }}>🎵</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 17 }}>{s.title}</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  <span style={{ color: s.color, fontWeight: 700 }}>{s.level}</span>
                  {'  '}
                  {'★'.repeat(s.stars)}
                  {'☆'.repeat(5 - s.stars)}
                  {'  '}· {s.bpm} BPM
                </span>
              </span>
              <span style={{ textAlign: 'right', fontSize: 12, opacity: 0.85 }}>
                <span style={{ opacity: 0.6 }}>최고</span>
                <br />
                <b style={{ fontSize: 15 }}>{best.toLocaleString()}</b>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 곡 플레이 화면 ──
function RhythmPlay({ song, onScore, onGameOver }: { song: Song } & Pick<GameProps, 'onScore' | 'onGameOver'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<(lane: number) => void>(() => {})
  const [combo, setCombo] = useState(0)
  const [judge, setJudge] = useState('')

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const laneW = W / LANES
    audio.unlock()

    const SPB = 60 / song.bpm
    const STEP = SPB / song.grid
    const stepsPerBar = song.grid * 4
    const totalSteps = song.bars * stepsPerBar

    type Note = { lane: number; time: number; hit: boolean }
    let notes: Note[] = []
    let score = 0
    let comboN = 0
    let maxCombo = 0
    let hits = 0
    let total = 0
    const flash = [0, 0, 0, 0]
    let over = false
    let raf = 0
    let scheduler = 0
    let nextStep = 0
    const nowSec = () => performance.now() / 1000
    const startTime = nowSec() + FALL + 1.2
    const endTime = startTime + (totalSteps - 1) * STEP + 0.8

    const finish = () => {
      if (over) return
      over = true
      cancelAnimationFrame(raf)
      clearInterval(scheduler)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    const scheduleAhead = () => {
      const now = nowSec()
      const acNow = audio.acTime
      while (nextStep < totalSteps) {
        const t = startTime + nextStep * STEP
        if (t > now + FALL + 0.3) break
        const when = acNow + (t - now)
        const s = nextStep % stepsPerBar
        const bar = Math.floor(nextStep / stepsPerBar)
        const isBeat = s % song.grid === 0
        const beatInBar = Math.floor(s / song.grid)
        // 드럼
        if (s % Math.max(1, song.grid / 2) === 0) audio.drum('hat', when, isBeat ? 1 : 0.5)
        if (isBeat && (beatInBar === 0 || beatInBar === 2)) {
          audio.drum('kick', when)
          audio.songNote(song.bass[bar % song.bass.length], when, 0.34, 'sine', 0.5)
        }
        if (isBeat && (beatInBar === 1 || beatInBar === 3)) audio.drum('snare', when)
        // 멜로디 = 게임플레이 노트
        const pat = song.notes[nextStep % song.notes.length]
        for (const lane of pat) {
          audio.songNote(song.scale[lane], when, 0.22, 'triangle', 0.28)
          notes.push({ lane, time: t, hit: false })
          total++
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
        hits++
        const perfect = bd < HIT_PERFECT
        comboN++
        maxCombo = Math.max(maxCombo, comboN)
        const mult = 1 + Math.min(2, Math.floor(comboN / 8) * 0.5)
        score += Math.round((perfect ? 100 : 50) * mult)
        onScore(score)
        setCombo(comboN)
        setJudge(perfect ? 'PERFECT!' : 'GOOD')
        setTimeout(() => setJudge(''), 280)
        audio.tone(song.scale[lane] * 2, 0.1, 'square', perfect ? 0.5 : 0.32)
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
      // 놓친 노트 → 콤보 끊김
      let missedAny = false
      for (const n of notes) {
        if (!n.hit && now - n.time > HIT_GOOD) {
          n.hit = true
          missedAny = true
        }
      }
      if (missedAny) {
        comboN = 0
        setCombo(0)
      }
      notes = notes.filter((n) => !(n.hit && now - n.time > 0.12) && now - n.time < 0.6)

      // 곡 종료
      if (now > endTime && nextStep >= totalSteps && notes.length === 0) return finish()

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
      for (const n of notes) {
        if (n.hit) continue
        const prog = (now - (n.time - FALL)) / FALL
        const y = TOPY + prog * (HITY - TOPY)
        ctx.fillStyle = COLORS[n.lane]
        ctx.beginPath()
        ctx.roundRect(n.lane * laneW + 6, y - 12, laneW - 12, 24, 8)
        ctx.fill()
      }
      // 진행바
      const prog = Math.max(0, Math.min(1, (now - startTime) / (endTime - startTime)))
      ctx.fillStyle = song.color
      ctx.fillRect(0, 0, W * prog, 4)

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
  }, [song, onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        🎵 {song.title} · {song.bpm} BPM — 박자에 맞춰 D F J K(또는 아래 버튼)!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px', minHeight: 20 }}>
        <span style={{ color: '#f7d23e' }}>{combo > 1 ? `${combo} COMBO` : ''}</span>
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

export default function RhythmGame({ onScore, onGameOver, onVariant }: GameProps) {
  const [song, setSong] = useState<Song | null>(null)
  if (!song) {
    return (
      <SongSelect
        onPick={(s) => {
          onVariant?.(s.id)
          setSong(s)
        }}
      />
    )
  }
  return <RhythmPlay key={song.id} song={song} onScore={onScore} onGameOver={onGameOver} />
}
