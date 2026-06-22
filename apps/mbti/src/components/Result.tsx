import { useState } from 'react'
import type { ResultData } from '../types'

interface Props {
  result: ResultData
  onRestart: () => void
}

export default function Result({ result, onRestart }: Props) {
  const { code, base, at, bd, growth, fullName } = result
  const [copied, setCopied] = useState(false)

  async function share() {
    const text = `나의 64유형 결과: ${code} — ${fullName} ${base.emoji}\n소리톡 64유형 MBTI 테스트에서 확인해보세요!`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title: '소리톡 64유형 MBTI', text, url })
        return
      } catch {
        /* 사용자가 취소 → 복사로 폴백 */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="result">
      <div className="result-emoji">{base.emoji}</div>
      <div className="result-code">{code}</div>
      <h2 className="result-name">{fullName}</h2>
      <p className="result-tagline">“{base.tagline}”</p>

      <p className="result-desc">{base.desc}</p>

      <div className="chips">
        <div className="chip-row">
          <span className="chip-label good">강점</span>
          <span className="chip-tags">
            {base.strengths.map((s) => (
              <span key={s} className="tag good">
                {s}
              </span>
            ))}
          </span>
        </div>
        <div className="chip-row">
          <span className="chip-label bad">약점</span>
          <span className="chip-tags">
            {base.weaknesses.map((s) => (
              <span key={s} className="tag bad">
                {s}
              </span>
            ))}
          </span>
        </div>
      </div>

      <section className="detail">
        <h3>💕 연애 · 관계</h3>
        <p>{base.love}</p>
      </section>
      <section className="detail">
        <h3>💼 일 · 공부</h3>
        <p>{base.work}</p>
      </section>
      <section className="detail">
        <h3>🧩 잘 맞는 유형</h3>
        <p>{base.match}</p>
      </section>

      <section className="trait">
        <h3>
          {at.emoji} 자기확신 · <b>{at.label}</b>
        </h3>
        <p className="trait-line">{at.line}</p>
        <p>{at.desc}</p>
        <p className="watch">💡 {at.watch}</p>
      </section>

      <section className="trait">
        <h3>
          {bd.emoji} 관계 방식 · <b>{bd.label}</b>
        </h3>
        <p className="trait-line">{bd.line}</p>
        <p>{bd.desc}</p>
        <p className="watch">💡 {bd.watch}</p>
      </section>

      <section className="growth">
        <h3>🪞 나를 위한 성장 한마디</h3>
        <p>{growth}</p>
      </section>

      <div className="actions">
        <button className="btn primary" onClick={share}>
          {copied ? '✅ 결과 복사됨!' : '결과 공유하기'}
        </button>
        <button className="btn ghost" onClick={onRestart}>
          다시 테스트하기
        </button>
      </div>
    </div>
  )
}
