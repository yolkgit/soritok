import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { audio } from '../lib/audio'

const N = 5
const COUNT = N * N
const TIME = 60

const shuffle = () => [...Array(COUNT).keys()].map((i) => i + 1).sort(() => Math.random() - 0.5)

export default function SchulteGame({ onScore, onGameOver }: GameProps) {
  const [nums, setNums] = useState<number[]>(shuffle)
  const [next, setNext] = useState(1)
  const [time, setTime] = useState(TIME)
  const [wrong, setWrong] = useState(-1)
  const scoreRef = useRef(0)
  const nextRef = useRef(1)
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

  const tap = (n: number) => {
    if (overRef.current) return
    if (n === nextRef.current) {
      scoreRef.current++
      onScore(scoreRef.current)
      if (nextRef.current >= COUNT) {
        // 한 판 완성 → 보너스 + 새 판
        scoreRef.current += 5
        onScore(scoreRef.current)
        nextRef.current = 1
        setNext(1)
        setNums(shuffle())
      } else {
        nextRef.current++
        setNext(nextRef.current)
      }
    } else {
      audio.play('hit')
      setWrong(n)
      setTimeout(() => setWrong(-1), 200)
    }
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        1부터 25까지 순서대로 최대한 빠르게 누르세요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>
        다음 <b style={{ color: '#f7d23e' }}>{next}</b> · 남은 시간{' '}
        <b style={{ color: time <= 10 ? '#ff6b6b' : '#54e07c' }}>{time}s</b>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 6,
          width: 'min(86vw, 320px)',
          margin: '0 auto',
        }}
      >
        {nums.map((n) => {
          const done = n < next
          return (
            <button
              key={n}
              onClick={() => tap(n)}
              style={{
                aspectRatio: '1 / 1',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 'min(5.5vw, 22px)',
                fontWeight: 800,
                color: done ? 'rgba(255,255,255,0.4)' : '#1b1140',
                background:
                  wrong === n
                    ? '#ff6b6b'
                    : done
                      ? 'rgba(255,255,255,0.08)'
                      : 'linear-gradient(135deg, #fff, #d9e2ff)',
                transition: 'background 0.1s',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
