import { useMemo, useState } from 'react'
import { AXES, QUESTIONS } from './data/questions'
import { composeResult } from './data/types'
import type { Letters } from './types'
import Intro from './components/Intro'
import Question from './components/Question'
import Result from './components/Result'

type Stage = 'intro' | 'quiz' | 'result'

// 답변 배열(각 문항에서 고른 pole)로 6축 글자를 계산
function scoreToLetters(answers: (string | null)[]): Letters {
  const tally: Record<string, Record<string, number>> = {}
  AXES.forEach((ax) => (tally[ax.id] = { [ax.poleA]: 0, [ax.poleB]: 0 }))

  answers.forEach((pole, i) => {
    if (!pole) return
    const ax = QUESTIONS[i].axis
    tally[ax][pole] += 1
  })

  const letters = {} as Letters
  AXES.forEach((ax) => {
    const t = tally[ax.id]
    // 동점이면 poleA로 (5문항이라 동점은 안 나지만 안전장치)
    letters[ax.id] = t[ax.poleA] >= t[ax.poleB] ? ax.poleA : ax.poleB
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
    return composeResult(scoreToLetters(answers))
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
