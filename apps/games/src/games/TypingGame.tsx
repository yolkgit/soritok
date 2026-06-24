import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const W = 420
const H = 300
const WORDS = [
  '사과', '바나나', '컴퓨터', '바둑', '소리톡', '게임', '코딩', '햇살', '구름', '바다',
  '학교', '친구', '강아지', '고양이', '연필', '책상', '음악', '여행', '커피', '하늘',
  '도서관', '자전거', '운동장', '아이스크림', '초콜릿', '무지개', '별빛', '바람개비', '딸기우유', '눈사람',
]

export default function TypingGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [lives, setLives] = useState(3)
  const livesRef = useRef(3)

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    type Word = { text: string; x: number; y: number; speed: number }
    let words: Word[] = []
    let score = 0
    let spawnT = 0
    let spawnGap = 1.6
    let fallBase = 34
    let over = false
    let raf = 0
    let last = performance.now()

    const spawn = () => {
      const text = WORDS[Math.floor(Math.random() * WORDS.length)]
      ctx.font = 'bold 20px Pretendard, sans-serif'
      const w = ctx.measureText(text).width
      words.push({ text, x: 10 + Math.random() * (W - w - 20), y: -6, speed: fallBase + Math.random() * 20 })
    }

    const end = () => {
      over = true
      cancelAnimationFrame(raf)
      onGameOver(score)
    }

    const submit = (val: string): boolean => {
      const idx = words.findIndex((w) => w.text === val)
      if (idx >= 0) {
        words.splice(idx, 1)
        score += 10
        onScore(score)
        return true
      }
      return false
    }

    function loop(t: number) {
      let dt = (t - last) / 1000
      last = t
      if (dt > 0.05) dt = 0.05

      spawnT += dt
      if (spawnT >= spawnGap) {
        spawnT = 0
        spawn()
        spawnGap = Math.max(0.7, spawnGap - 0.02)
        fallBase = Math.min(90, fallBase + 0.6)
      }

      for (const w of words) w.y += w.speed * dt
      const reached = words.filter((w) => w.y > H - 6)
      if (reached.length) {
        words = words.filter((w) => w.y <= H - 6)
        livesRef.current -= reached.length
        setLives(Math.max(0, livesRef.current))
        if (livesRef.current <= 0) return end()
      }

      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, W, H)
      // 바닥선
      ctx.strokeStyle = 'rgba(255,107,107,0.4)'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(0, H - 6)
      ctx.lineTo(W, H - 6)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = 'bold 20px Pretendard, sans-serif'
      ctx.textBaseline = 'top'
      const typed = inputRef.current?.value ?? ''
      for (const w of words) {
        const match = typed && w.text.startsWith(typed)
        ctx.fillStyle = match ? '#f7d23e' : '#fff'
        ctx.fillText(w.text, w.x, w.y)
      }

      if (!over) raf = requestAnimationFrame(loop)
    }

    // 입력값이 떨어지는 단어와 일치하면 즉시 제거(+점수)하고 입력창 비우기
    const onType = () => {
      const el = inputRef.current!
      if (submit(el.value.trim())) el.value = ''
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const el = inputRef.current!
        submit(el.value.trim())
        el.value = ''
      }
    }

    const el = inputRef.current!
    el.addEventListener('input', onType)
    el.addEventListener('keydown', onKeyDown)
    el.focus()

    raf = requestAnimationFrame(loop)
    return () => {
      over = true
      cancelAnimationFrame(raf)
      el.removeEventListener('input', onType)
      el.removeEventListener('keydown', onKeyDown)
    }
  }, [onScore, onGameOver])

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 6px' }}>
        떨어지는 단어를 입력창에 똑같이 쳐서 없애세요. 바닥에 닿으면 ❤️가 줄어요!
      </p>
      <div style={{ fontWeight: 800, fontSize: 15, margin: '0 0 10px' }}>
        {'❤️'.repeat(lives)}
        {'🖤'.repeat(Math.max(0, 3 - lives))}
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: 'min(94vw, 420px)',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="여기에 단어를 입력하세요"
        style={{
          display: 'block',
          width: 'min(94vw, 420px)',
          boxSizing: 'border-box',
          margin: '12px auto 0',
          padding: '12px 14px',
          borderRadius: 12,
          border: '2px solid rgba(124,92,255,0.5)',
          background: 'rgba(255,255,255,0.95)',
          color: '#1b1140',
          fontSize: 17,
          fontWeight: 700,
          outline: 'none',
          textAlign: 'center',
        }}
      />
    </div>
  )
}
