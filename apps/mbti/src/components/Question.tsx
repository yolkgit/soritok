import type { Question as Q } from '../types'

interface Props {
  index: number
  total: number
  question: Q
  selected: number | null
  onAnswer: (value: number) => void
  onBack: () => void
}

// 리커트 5점 척도
const SCALE = [
  { v: 1, label: '전혀\n아니다', size: 56, fill: '#ef8a8a' },
  { v: 2, label: '아니다', size: 46, fill: '#f0a98a' },
  { v: 3, label: '보통', size: 38, fill: '#cfc7e8' },
  { v: 4, label: '그렇다', size: 46, fill: '#8fd0c4' },
  { v: 5, label: '매우\n그렇다', size: 56, fill: '#5cc0a8' },
]

export default function Question({ index, total, question, selected, onAnswer, onBack }: Props) {
  const pct = Math.round((index / total) * 100)
  return (
    <div className="quiz">
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="counter">
        Q{index + 1} <span>/ {total}</span>
      </div>

      <p className="q-statement">{question.text}</p>

      <div className="likert">
        {SCALE.map((s) => (
          <button
            key={s.v}
            className={`likert-dot ${selected === s.v ? 'sel' : ''}`}
            onClick={() => onAnswer(s.v)}
            aria-label={s.label.replace('\n', ' ')}
          >
            <span
              className="dot"
              style={{
                width: s.size,
                height: s.size,
                borderColor: s.fill,
                background: selected === s.v ? s.fill : 'transparent',
              }}
            />
            <span className="likert-label">{s.label}</span>
          </button>
        ))}
      </div>

      <button className="btn ghost" onClick={onBack}>
        ← 이전
      </button>
    </div>
  )
}
