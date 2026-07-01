import { useState } from 'react'
import type { ResultData } from '../types'

interface Props {
  result: ResultData
  onRestart: () => void
}

export default function Result({ result, onRestart }: Props) {
  const { code, base, at, bd, growth, fullName, axes, functions, stress, careers, growthTasks, relationGuide, combo } = result
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
        <h3>📊 축별 선호도 분석</h3>
        <div className="axes">
          {axes.map((ax) => {
            const leftPicked = ax.pick === ax.leftPole
            return (
              <div className="axis" key={ax.id}>
                <div className="axis-head">
                  <span className={leftPicked ? 'on' : ''}>{ax.leftLabel}</span>
                  <span className="axis-name">{ax.name}</span>
                  <span className={!leftPicked ? 'on' : ''}>{ax.rightLabel}</span>
                </div>
                <div className="axis-bar">
                  <div
                    className={`axis-fill ${leftPicked ? 'left' : 'right'}`}
                    style={{ width: `${leftPicked ? ax.leftPct : ax.rightPct}%`, marginLeft: leftPicked ? 0 : 'auto' }}
                  />
                  <span className="axis-pct">{leftPicked ? ax.leftPct : ax.rightPct}%</span>
                </div>
                <div className="axis-clarity">선호 명확도 · {ax.clarity}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="detail">
        <h3>🧠 인지기능 스택 <span className="sub">융 심리유형</span></h3>
        <p className="fn-intro">
          이 유형이 정보를 받아들이고 판단하는 정신적 도구의 우선순위입니다. 위에 있을수록 자연스럽고 익숙하게 쓰며, 맨
          아래 <b>열등기능</b>은 평소엔 약하지만 스트레스 상황에서 다른 모습으로 드러납니다.
        </p>
        <div className="fns">
          {functions.map((f, i) => (
            <div className={`fn ${i === 0 ? 'fn-dom' : ''}`} key={f.code}>
              <span className="fn-pos">{f.pos}</span>
              <span className="fn-body">
                <b>{f.name}</b>
                <span className="fn-desc">{f.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="detail">
        <h3>💕 연애 · 관계</h3>
        <p>{base.love}</p>
      </section>
      <section className="detail">
        <h3>💼 일 · 공부</h3>
        <p>{base.work}</p>
      </section>
      <section className="detail">
        <h3>🧭 추천 직무 · 분야</h3>
        <div className="chip-tags" style={{ marginTop: 4 }}>
          {careers.map((c) => (
            <span key={c} className="tag good">
              {c}
            </span>
          ))}
        </div>
      </section>
      <section className="detail">
        <h3>🧩 잘 맞는 유형</h3>
        <p>{base.match}</p>
      </section>
      <section className="detail">
        <h3>🤝 이 유형과 잘 지내는 법</h3>
        <p>{relationGuide}</p>
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

      <section className="detail">
        <h3>🔗 조합 심층 <span className="sub">{combo.label}</span></h3>
        <p>{combo.desc}</p>
      </section>

      <section className="detail">
        <h3>🌪️ 스트레스 반응 <span className="sub">열등기능 그립</span></h3>
        <p>{stress}</p>
        <p className="watch">💡 평소의 강점 기능(주·부기능)으로 에너지를 채우면 빠르게 균형을 회복할 수 있어요.</p>
      </section>

      <section className="detail">
        <h3>🌱 발달 과제 <span className="sub">성장 제언</span></h3>
        <ul className="tasklist">
          {growthTasks.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="growth">
        <h3>🪞 나를 위한 성장 한마디</h3>
        <p>{growth}</p>
      </section>

      <p className="disclaimer">
        ※ 이 결과는 자기보고식 <b>선호 지표</b>로, 자기 이해를 돕기 위한 참고 자료입니다. 사람을 고정된 틀에 가두는
        의학적·임상적 진단이 아니며, 같은 유형 안에서도 성장 환경과 경험에 따라 모습은 다양합니다.
      </p>

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
