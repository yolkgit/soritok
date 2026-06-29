import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'
import { activeSongs, buildChart, DIFFS, type Difficulty, type Song } from '../data/songs'
import { getLocalBest } from '../lib/scores'

const LANES = 4
const W = 320
const H = 440
const HITY = H - 60
const TOPY = -24
const COLORS = ['#ff6b6b', '#f7d23e', '#54e07c', '#36cfe6']
const KEYS = ['d', 'f', 'j', 'k']
const FALL = 1.5
const HIT_GOOD = 0.155
const HIT_PERFECT = 0.05

// ── 곡 선택 ──
function SongSelect({ onPick }: { onPick: (s: Song) => void }) {
  const songs = activeSongs()
  const month = songs[0]?.month ?? ''
  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <p style={{ opacity: 0.75, fontSize: 13, textAlign: 'center', margin: '0 0 4px' }}>
        이달의 곡 ({month}) — 곡을 고르고 난이도를 정해 기록에 도전하세요! 🎵
      </p>
      <p style={{ opacity: 0.45, fontSize: 11, textAlign: 'center', margin: '0 0 14px' }}>
        ※ 저작권상 실제 K-POP 음원은 못 싣고, 매월 교체되는 오리지널 트랙입니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {songs.map((s) => (
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
                {s.artist} · {s.bpm} BPM
              </span>
            </span>
            <span style={{ color: s.color, fontSize: 20 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 난이도 선택 ──
function DiffSelect({ song, onBack, onPick }: { song: Song; onBack: () => void; onPick: (d: Difficulty) => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
      <button
        onClick={onBack}
        style={{ border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, marginBottom: 14, fontSize: 13 }}
      >
        ‹ 곡 목록
      </button>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 2 }}>🎵 {song.title}</div>
      <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 16 }}>{song.bpm} BPM · 난이도를 고르세요</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DIFFS.map((d) => {
          const best = getLocalBest(`rhythm::${song.id}:${d.id}`)
          return (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${song.color}55`,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: 17 }}>
                {d.label} <span style={{ color: song.color }}>{'★'.repeat(d.stars)}{'☆'.repeat(3 - d.stars)}</span>
              </span>
              <span style={{ fontSize: 12, opacity: 0.85, textAlign: 'right' }}>
                <span style={{ opacity: 0.6 }}>최고</span> <b style={{ fontSize: 15 }}>{best.toLocaleString()}</b>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 플레이 ──
function RhythmPlay({ song, diff, onScore, onGameOver }: { song: Song; diff: Difficulty } & Pick<GameProps, 'onScore' | 'onGameOver'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<(lane: number) => void>(() => {})
  const [combo, setCombo] = useState(0)
  const [judge, setJudge] = useState('')

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const laneW = W / LANES
    audio.unlock()
    const chart = buildChart(song, diff)
    const SPB = 60 / song.bpm

    type N = { lane: number; time: number; hit: boolean }
    let notes: N[] = []
    let score = 0
    let comboN = 0
    const flash = [0, 0, 0, 0]
    let over = false
    let raf = 0
    let scheduler = 0
    let ni = 0
    let pi = 0
    let bi = 0
    let di = 0
    const nowSec = () => performance.now() / 1000
    const startTime = nowSec() + FALL + 1.2
    const endTime = startTime + chart.totalBeats * SPB + 0.8
    const bt = (beat: number) => startTime + beat * SPB

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
      const ac = audio.acTime
      const horizon = now + FALL + 0.3
      const when = (beat: number) => ac + (bt(beat) - now)
      while (ni < chart.notes.length && bt(chart.notes[ni].beat) <= horizon) {
        const n = chart.notes[ni++]
        audio.songNote(n.freq, when(n.beat), 0.22, 'triangle', 0.32)
        notes.push({ lane: n.lane, time: bt(n.beat), hit: false })
      }
      while (pi < chart.pad.length && bt(chart.pad[pi].beat) <= horizon) {
        const v = chart.pad[pi++]
        audio.songNote(v.freq, when(v.beat), v.dur * SPB, 'sine', 0.1)
      }
      while (bi < chart.bass.length && bt(chart.bass[bi].beat) <= horizon) {
        const v = chart.bass[bi++]
        audio.songNote(v.freq, when(v.beat), v.dur * SPB, 'sine', 0.5)
      }
      while (di < chart.drums.length && bt(chart.drums[di].beat) <= horizon) {
        const d = chart.drums[di++]
        audio.drum(d.kind, when(d.beat), d.kind === 'hat' ? 0.7 : 1)
      }
    }

    const hit = (lane: number) => {
      if (over) return
      flash[lane] = 0.28
      const now = nowSec()
      let best: N | null = null
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
        comboN++
        const mult = 1 + Math.min(2, Math.floor(comboN / 8) * 0.5)
        score += Math.round((perfect ? 100 : 50) * mult)
        onScore(score)
        setCombo(comboN)
        setJudge(perfect ? 'PERFECT!' : 'GOOD')
        setTimeout(() => setJudge(''), 260)
        audio.tone(best ? mtofLane(lane, song) : 880, 0.1, 'square', perfect ? 0.5 : 0.32)
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
      let missed = false
      for (const n of notes) {
        if (!n.hit && now - n.time > HIT_GOOD) {
          n.hit = true
          missed = true
        }
      }
      if (missed) {
        comboN = 0
        setCombo(0)
      }
      notes = notes.filter((n) => !(n.hit && now - n.time > 0.12) && now - n.time < 0.6)
      if (now > endTime && ni >= chart.notes.length && notes.length === 0) return finish()

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
      const p = Math.max(0, Math.min(1, (now - startTime) / (endTime - startTime)))
      ctx.fillStyle = song.color
      ctx.fillRect(0, 0, W * p, 4)

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
  }, [song, diff, onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        🎵 {song.title} ({DIFFS.find((d) => d.id === diff)?.label}) — D F J K 또는 아래 버튼!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px', minHeight: 20 }}>
        <span style={{ color: '#f7d23e' }}>{combo > 1 ? `${combo} COMBO` : ''}</span>
        <span style={{ marginLeft: 10, color: '#54e07c' }}>{judge}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: 'min(80vw, 320px)', borderRadius: 12, touchAction: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
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
            style={{ padding: '16px 0', borderRadius: 12, border: 'none', background: c, color: '#1b1140', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
          >
            {KEYS[i].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

// 레인 → 대략적 음정(히트 확인음용)
function mtofLane(lane: number, song: Song): number {
  const base = [523.25, 587.33, 659.25, 783.99]
  void song
  return base[lane] * 2
}

export default function RhythmGame({ onScore, onGameOver, onVariant }: GameProps) {
  const [song, setSong] = useState<Song | null>(null)
  const [diff, setDiff] = useState<Difficulty | null>(null)

  if (!song) return <SongSelect onPick={setSong} />
  if (!diff) return <DiffSelect song={song} onBack={() => setSong(null)} onPick={(d) => { onVariant?.(`${song.id}:${d}`); setDiff(d) }} />
  return <RhythmPlay key={`${song.id}:${diff}`} song={song} diff={diff} onScore={onScore} onGameOver={onGameOver} />
}
