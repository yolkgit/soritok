import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const TIME = 30

type Round = { cols: number; total: number; odd: number; base: string; diff: string }

function makeRound(level: number): Round {
  const cols = Math.min(7, 2 + Math.floor(level / 2))
  const total = cols * cols
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 20)
  const l = 45 + Math.floor(Math.random() * 15)
  const delta = Math.max(5, 26 - level * 1.6)
  const sign = Math.random() < 0.5 ? -1 : 1
  return {
    cols,
    total,
    odd: Math.floor(Math.random() * total),
    base: `hsl(${h} ${s}% ${l}%)`,
    diff: `hsl(${h} ${s}% ${Math.round(l + sign * delta)}%)`,
  }
}

export default function OddColorGame({ onScore, onGameOver }: GameProps) {
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [time, setTime] = useState(TIME)
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const overRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => {
      setTime((s) => {
        if (s <= 1) {
          clearInterval(t)
          overRef.current = true
          setTimeout(() => onGameOver(scoreRef.current), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [onGameOver])

  const tap = (i: number) => {
    if (overRef.current) return
    if (i === round.odd) {
      scoreRef.current += 10
      onScore(scoreRef.current)
      levelRef.current++
      setLevel(levelRef.current)
      setRound(makeRound(levelRef.current))
    } else {
      // 오답: 시간 감소
      setTime((s) => Math.max(0, s - 3))
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        딱 하나 색이 다른 칸을 찾아 누르세요! 오답은 시간 -3초
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>
        레벨 <b style={{ color: '#f7d23e' }}>{level}</b> · 남은 시간{' '}
        <b style={{ color: time <= 8 ? '#ff6b6b' : '#54e07c' }}>{time}s</b>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${round.cols}, 1fr)`,
          gap: 5,
          width: 'min(86vw, 320px)',
          margin: '0 auto',
        }}
      >
        {Array.from({ length: round.total }).map((_, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            style={{
              aspectRatio: '1 / 1',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: i === round.odd ? round.diff : round.base,
            }}
          />
        ))}
      </div>
    </div>
  )
}
