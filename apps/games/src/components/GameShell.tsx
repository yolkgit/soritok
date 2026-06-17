import { useRef, useState } from 'react'
import { useAuth } from '@soritok/auth'
import type { GameDef } from '../types'
import { getLocalBest, setLocalBest, submitScore } from '../lib/scores'
import Leaderboard from './Leaderboard'

interface Props {
  game: GameDef
  onExit: () => void
}

export default function GameShell({ game, onExit }: Props) {
  const { token, user, isAuthenticated } = useAuth()
  const [runKey, setRunKey] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => getLocalBest(game.id))
  const [over, setOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'login'>('idle')
  const [refreshKey, setRefreshKey] = useState(0)
  const handled = useRef(false)

  const restart = () => {
    setScore(0)
    setOver(false)
    setFinalScore(0)
    setSubmitState('idle')
    handled.current = false
    setRunKey((k) => k + 1)
  }

  const handleGameOver = (s: number) => {
    if (handled.current) return
    handled.current = true
    setFinalScore(s)
    setOver(true)
    setBest(setLocalBest(game.id, s))
    if (isAuthenticated && token) {
      setSubmitState('saving')
      submitScore(game.id, s, token).then((ok) => {
        setSubmitState(ok ? 'saved' : 'idle')
        if (ok) setRefreshKey((k) => k + 1)
      })
    } else {
      setSubmitState('login')
    }
  }

  const Game = game.Component

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 18px' }}>
        <button
          onClick={onExit}
          style={{
            border: 'none',
            background: 'rgba(255,255,255,0.14)',
            color: '#fff',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ← 메뉴
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          {game.emoji} {game.title}
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontWeight: 800 }}>
          <span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>{game.scoreLabel} </span>
            {score.toLocaleString()}
          </span>
          <span style={{ color: game.color }}>
            <span style={{ opacity: 0.6, fontSize: 12 }}>최고 </span>
            {best.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
          <Game key={runKey} onScore={setScore} onGameOver={handleGameOver} />

          {over && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,10,46,0.86)',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                textAlign: 'center',
                padding: 20,
              }}
            >
              <div style={{ fontSize: 40 }}>{game.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>게임 오버!</div>
              <div style={{ fontSize: 16 }}>
                {game.scoreLabel}: <b style={{ color: game.color }}>{finalScore.toLocaleString()}</b>
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, minHeight: 18 }}>
                {submitState === 'saving' && '랭킹에 기록 중…'}
                {submitState === 'saved' && '🏆 전역 랭킹에 등록됐어요!'}
                {submitState === 'login' && '로그인하면 전역 랭킹에 도전할 수 있어요'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={restart}
                  style={{
                    border: 'none',
                    background: game.color,
                    color: '#1b1140',
                    borderRadius: 999,
                    padding: '11px 24px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  다시하기
                </button>
                <button
                  onClick={onExit}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.16)',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '11px 24px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  메뉴로
                </button>
              </div>
            </div>
          )}
        </div>

        <Leaderboard gameId={game.id} refreshKey={refreshKey} myEmail={user?.email} />
      </div>
    </div>
  )
}
