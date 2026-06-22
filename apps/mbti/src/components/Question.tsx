import type { Question as Q } from '../types'

interface Props {
  index: number
  total: number
  question: Q
  selected: string | null
  onChoose: (pole: string) => void
  onBack: () => void
}

export default function Question({
  index,
  total,
  question,
  selected,
  onChoose,
  onBack,
}: Props) {
  const pct = Math.round((index / total) * 100)
  return (
    <div className="quiz">
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="counter">
        Q{index + 1} <span>/ {total}</span>
      </div>

      <div className="choices">
        <button
          className={`choice ${selected === question.a.pole ? 'sel' : ''}`}
          onClick={() => onChoose(question.a.pole)}
        >
          {question.a.text}
        </button>
        <div className="vs">또는</div>
        <button
          className={`choice ${selected === question.b.pole ? 'sel' : ''}`}
          onClick={() => onChoose(question.b.pole)}
        >
          {question.b.text}
        </button>
      </div>

      <button className="btn ghost" onClick={onBack}>
        ← 이전
      </button>
    </div>
  )
}
