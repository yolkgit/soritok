import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const PADS = [
  { on: '#54e07c', off: '#1e5233' },
  { on: '#ff6b6b', off: '#5a2626' },
  { on: '#f7d23e', off: '#574b15' },
  { on: '#36cfe6', off: '#16505c' },
]

export default function SimonGame({ onScore, onGameOver }: GameProps) {
  const [seqLen, setSeqLen] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)
  const [accepting, setAccepting] = useState(false)

  const seqRef = useRef<number[]>([])
  const inputIdx = useRef(0)
  const timers = useRef<number[]>([])
  const overRef = useRef(false)
  const nextRoundRef = useRef<() => void>(() => {})

  useEffect(() => {
    // 매 마운트마다 초기화 (StrictMode 이중 마운트에도 견고)
    overRef.current = false
    seqRef.current = []
    inputIdx.current = 0

    const push = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms)
      timers.current.push(t)
    }

    const playSequence = (s: number[]) => {
      let i = 0
      const playNext = () => {
        if (overRef.current) return
        if (i >= s.length) {
          inputIdx.current = 0
          setAccepting(true)
          return
        }
        setFlash(s[i])
        push(() => {
          setFlash(null)
          push(() => {
            i++
            playNext()
          }, 200)
        }, 440)
      }
      playNext()
    }

    const nextRound = () => {
      if (overRef.current) return
      const s = [...seqRef.current, Math.floor(Math.random() * 4)]
      seqRef.current = s
      setSeqLen(s.length)
      setAccepting(false)
      push(() => playSequence(s), 650)
    }
    nextRoundRef.current = nextRound
    nextRound()

    return () => {
      overRef.current = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [])

  const flashPad = (p: number) => {
    setFlash(p)
    const t = window.setTimeout(() => setFlash((f) => (f === p ? null : f)), 160)
    timers.current.push(t)
  }

  const handlePad = (p: number) => {
    if (!accepting || overRef.current) return
    flashPad(p)
    if (p === seqRef.current[inputIdx.current]) {
      inputIdx.current++
      if (inputIdx.current >= seqRef.current.length) {
        setAccepting(false)
        onScore(seqRef.current.length)
        const t = window.setTimeout(() => nextRoundRef.current(), 750)
        timers.current.push(t)
      }
    } else {
      overRef.current = true
      setAccepting(false)
      onGameOver(Math.max(0, seqRef.current.length - 1))
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 8px' }}>
        불빛 순서를 잘 본 뒤 똑같이 따라 누르세요. 단계가 길어질수록 어려워져요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 12px', minHeight: 20 }}>
        {accepting ? '🎯 따라 누르세요!' : seqLen ? '👀 잘 보세요…' : '준비…'}
        <span style={{ opacity: 0.6, marginLeft: 10, fontSize: 13 }}>단계 {seqLen}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          width: 'min(78vw, 280px)',
          margin: '0 auto',
        }}
      >
        {PADS.map((pad, i) => (
          <button
            key={i}
            onClick={() => handlePad(i)}
            disabled={!accepting}
            style={{
              aspectRatio: '1 / 1',
              border: 'none',
              borderRadius:
                i === 0
                  ? '80% 12px 12px 12px'
                  : i === 1
                    ? '12px 80% 12px 12px'
                    : i === 2
                      ? '12px 12px 12px 80%'
                      : '12px 12px 80% 12px',
              background: flash === i ? pad.on : pad.off,
              boxShadow: flash === i ? `0 0 28px ${pad.on}` : 'inset 0 -6px 12px rgba(0,0,0,0.35)',
              cursor: accepting ? 'pointer' : 'default',
              transition: 'background 0.08s, box-shadow 0.08s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
