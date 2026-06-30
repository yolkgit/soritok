import { useMemo, useState } from 'react'
import { AXES, QUESTIONS } from './data/questions'
import { composeResult, type AxisCounts } from './data/types'
import type { AxisId, Letters } from './types'
import Intro from './components/Intro'
import Question from './components/Question'
import Result from './components/Result'

type Stage = 'intro' | 'quiz' | 'result'

// 답변 배열 → 축별 poleA/poleB 득점 집계
function axisCounts(answers: (string | null)[]): AxisCounts {
  const counts = {} as AxisCounts
  AXES.forEach((ax) => (counts[ax.id] = { a: 0, b: 0 }))
  answers.forEach((pole, i) => {
    if (!pole) return
    const ax = AXES.find((x) => x.id === QUESTIONS[i].axis)!
    if (pole === ax.poleA) counts[ax.id].a += 1
    else counts[ax.id].b += 1
  })
  return counts
}

// 득점 집계 → 6축 글자 (동점이면 poleA)
function lettersFromCounts(counts: AxisCounts): Letters {
  const letters = {} as Letters
  AXES.forEach((ax) => {
    letters[ax.id as AxisId] = counts[ax.id].a >= counts[ax.id].b ? ax.poleA : ax.poleB
  })
  return letters
}

export default function App() {
  const [stage, setStage] = useState<Stage>('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(
    Array(QUESTIONS.length).fill(null),
  )

  const result = useMemo(() => {
    if (stage !== 'result') return null
    const counts = axisCounts(answers)
    return composeResult(lettersFromCounts(counts), counts)
  }, [stage, answers])

  function start() {
    setAnswers(Array(QUESTIONS.length).fill(null))
    setStep(0)
    setStage('quiz')
  }

  function choose(pole: string) {
    const next = answers.slice()
    next[step] = pole
    setAnswers(next)
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      setStage('result')
    }
  }

  function back() {
    if (step > 0) setStep(step - 1)
    else setStage('intro')
  }

  function restart() {
    setStage('intro')
    setStep(0)
  }

  return (
    <div className="app">
      <div className="mirror">
        <div className="card">
          <span className="glass-sheen" aria-hidden />
          <span className="glass-top" aria-hidden />
          {stage === 'intro' && <Intro onStart={start} total={QUESTIONS.length} />}
          {stage === 'quiz' && (
            <Question
              index={step}
              total={QUESTIONS.length}
              question={QUESTIONS[step]}
              selected={answers[step]}
              onChoose={choose}
              onBack={back}
            />
          )}
          {stage === 'result' && result && (
            <Result result={result} onRestart={restart} />
          )}
        </div>
        <span className="mirror-base" aria-hidden />
      </div>
      <footer className="foot">
        소리톡 · 책상 위 작은 거울 앞에서 나를 들여다보는 시간 🪞
      </footer>
    </div>
  )
}
