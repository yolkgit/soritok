import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const EMOJIS = ['🍎', '🍊', '🍇', '🍉', '🍓', '🍌', '🥝', '🍑', '🍍', '🥥', '🍒', '🫐']
const PAIRS = 8
const TIME = 50

type Card = { id: number; key: number; emoji: string; matched: boolean }

function makeBoard(): Card[] {
  const picks = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, PAIRS)
  const dealt = picks.flatMap((e, i) => [
    { id: i, emoji: e },
    { id: i, emoji: e },
  ])
  return dealt
    .sort(() => Math.random() - 0.5)
    .map((c, idx) => ({ ...c, key: idx, matched: false }))
}

export default function MemoryGame({ onScore, onGameOver }: GameProps) {
  const [cards, setCards] = useState<Card[]>(makeBoard)
  const [flipped, setFlipped] = useState<number[]>([])
  const [time, setTime] = useState(TIME)
  const scoreRef = useRef(0)
  const lockRef = useRef(false)
  const overRef = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const clock = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(clock)
          overRef.current = true
          const x = window.setTimeout(() => onGameOver(scoreRef.current), 0)
          timers.current.push(x)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      clearInterval(clock)
      overRef.current = true
      timers.current.forEach(clearTimeout)
    }
  }, [onGameOver])

  const flip = (key: number) => {
    if (overRef.current || lockRef.current) return
    const card = cards.find((c) => c.key === key)!
    if (card.matched || flipped.includes(key)) return
    const nf = [...flipped, key]
    setFlipped(nf)
    audio.play('click')
    if (nf.length < 2) return

    lockRef.current = true
    const a = cards.find((c) => c.key === nf[0])!
    const b = cards.find((c) => c.key === nf[1])!
    if (a.id === b.id) {
      audio.play('pop')
      const x = window.setTimeout(() => {
        scoreRef.current += 10
        onScore(scoreRef.current)
        setCards((cs) => {
          const next = cs.map((c) => (c.key === a.key || c.key === b.key ? { ...c, matched: true } : c))
          if (next.every((c) => c.matched)) {
            scoreRef.current += 30
            onScore(scoreRef.current)
            return makeBoard()
          }
          return next
        })
        setFlipped([])
        lockRef.current = false
      }, 320)
      timers.current.push(x)
    } else {
      const x = window.setTimeout(() => {
        setFlipped([])
        lockRef.current = false
      }, 720)
      timers.current.push(x)
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        같은 그림 카드 두 장을 찾아 짝을 맞추세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>
        남은 시간 <b style={{ color: time <= 10 ? '#ff6b6b' : '#54e07c' }}>{time}s</b>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          width: 'min(82vw, 300px)',
          margin: '0 auto',
        }}
      >
        {cards.map((c) => {
          const shown = c.matched || flipped.includes(c.key)
          return (
            <button
              key={c.key}
              onClick={() => flip(c.key)}
              style={{
                aspectRatio: '1 / 1',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                perspective: 600,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transition: 'transform 0.3s',
                  transformStyle: 'preserve-3d',
                  transform: shown ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #7c5cff, #5b8cf0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  ❓
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    borderRadius: 12,
                    background: c.matched ? 'rgba(84,224,124,0.25)' : 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                  }}
                >
                  {c.emoji}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
