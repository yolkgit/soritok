import { useMemo, useState } from 'react'
import { QUESTIONS } from './data/questions'
import { composeResult, scoreAnswers } from './data/types'
import Intro from './components/Intro'
import Question from './components/Question'
import Result from './components/Result'

type Stage = 'intro' | 'quiz' | 'result'

export default function App() {
  const [stage, setStage] = useState<Stage>('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUESTIONS.length).fill(null),
  )

  const result = useMemo(() => {
    if (stage !== 'result') return null
    const { letters, axes } = scoreAnswers(answers)
    return composeResult(letters, axes)
  }, [stage, answers])

  function start() {
    setAnswers(Array(QUESTIONS.length).fill(null))
    setStep(0)
    setStage('quiz')
  }

  // 리커트 응답(1~5) 저장 후 다음 문항으로
  function answer(value: number) {
    const next = answers.slice()
    next[step] = value
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
              onAnswer={answer}
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
