import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const HOLES = 9
const GAME_TIME = 30

export default function WhackAMole({ onScore, onGameOver }: GameProps) {
  const [active, setActive] = useState<number | null>(null)
  const [, setScore] = useState(0)
  const [time, setTime] = useState(GAME_TIME)
  const [bonk, setBonk] = useState<number | null>(null)
  const scoreRef = useRef(0)

  useEffect(() => {
    const spawn = setInterval(() => {
      setActive(Math.floor(Math.random() * HOLES))
    }, 800)

    const clock = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(spawn)
          clearInterval(clock)
          setActive(null)
          setTimeout(() => onGameOver(scoreRef.current), 0)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      clearInterval(spawn)
      clearInterval(clock)
    }
  }, [onGameOver])

  const hit = (i: number) => {
    if (i !== active || time === 0) return
    setActive(null)
    setBonk(i)
    setTimeout(() => setBonk((b) => (b === i ? null : b)), 200)
    const ns = scoreRef.current + 1
    scoreRef.current = ns
    setScore(ns)
    onScore(ns)
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        30초 동안 튀어나오는 두더지를 최대한 많이 잡으세요! 남은 시간 <b>{time}s</b>
      </p>
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          padding: 14,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 16,
        }}
      >
        {Array.from({ length: HOLES }).map((_, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            style={{
              width: 'min(24vw, 90px)',
              height: 'min(24vw, 90px)',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background:
                'radial-gradient(circle at 50% 75%, #5a3a1f, #2c1d10 70%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 6,
              overflow: 'hidden',
              fontSize: 'min(13vw, 46px)',
              lineHeight: 1,
            }}
          >
            <span
              style={{
                transform:
                  bonk === i
                    ? 'translateY(10%) scale(0.85)'
                    : active === i
                      ? 'translateY(0)'
                      : 'translateY(120%)',
                transition: 'transform 0.12s ease',
              }}
            >
              {bonk === i ? '💥' : '🐹'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
