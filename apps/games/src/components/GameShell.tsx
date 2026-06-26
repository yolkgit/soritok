import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@soritok/auth'
import type { GameDef } from '../types'
import { getLocalBest, setLocalBest, submitScore } from '../lib/scores'
import { audio } from '../lib/audio'
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
  const [soundOn, setSoundOn] = useState(audio.enabled)
  const [variant, setVariant] = useState<string | null>(null)
  const handled = useRef(false)
  const prevScore = useRef(0)
  const lastSfx = useRef(0)

  // 곡별 순위 등 세분화 키. variant 가 있으면 game.id::variant 로 기록/리더보드 분리
  const scoreKey = variant ? `${game.id}::${variant}` : game.id
  useEffect(() => {
    setBest(getLocalBest(scoreKey))
  }, [scoreKey])

  // 게임 진입 시 배경음 시작(자체 곡을 쓰는 게임은 제외), 나갈 때 정지
  useEffect(() => {
    audio.unlock()
    if (!game.ownMusic) audio.startMusic()
    return () => audio.stopMusic()
  }, [game.ownMusic])

  const restart = () => {
    audio.play('click')
    setScore(0)
    setOver(false)
    setFinalScore(0)
    setSubmitState('idle')
    handled.current = false
    prevScore.current = 0
    setVariant(null)
    if (!game.ownMusic) audio.startMusic()
    setRunKey((k) => k + 1)
  }

  const toggleSound = () => {
    const on = !soundOn
    setSoundOn(on)
    audio.setEnabled(on)
    if (on && !game.ownMusic) audio.startMusic()
  }

  const handleGameOver = (s: number) => {
    if (handled.current) return
    handled.current = true
    audio.play('gameover')
    setFinalScore(s)
    setOver(true)
    setBest(setLocalBest(scoreKey, s))
    if (isAuthenticated && token) {
      setSubmitState('saving')
      submitScore(scoreKey, s, token).then((ok) => {
        setSubmitState(ok ? 'saved' : 'idle')
        if (ok) setRefreshKey((k) => k + 1)
      })
    } else {
      setSubmitState('login')
    }
  }

  // 게임에 넘기는 콜백은 "고정 참조"여야 합니다. 그렇지 않으면 점수가 바뀔 때마다
  // GameShell 이 리렌더되며 새 콜백이 생기고, 게임의 useEffect([onScore,onGameOver])가
  // 재실행되어 게임 상태(보드/공/뱀)가 통째로 초기화됩니다.
  const overRef = useRef(handleGameOver)
  overRef.current = handleGameOver
  const stableOnScore = useCallback((s: number) => {
    if (s > prevScore.current) {
      // 점수 오를 때 효과음 (빠른 증가 게임에서 도배되지 않게 스로틀)
      const now = performance.now()
      if (now - lastSfx.current > 110) {
        lastSfx.current = now
        audio.play('point')
      }
    }
    prevScore.current = s
    setScore(s)
  }, [])
  const stableOnGameOver = useCallback((s: number) => overRef.current(s), [])
  const stableOnVariant = useCallback((v: string | null) => {
    setVariant(v)
    setScore(0)
    prevScore.current = 0
  }, [])

  const Game = game.Component

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 16px 80px' }}>
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
        <button
          onClick={toggleSound}
          aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
          title={soundOn ? '소리 끄기' : '소리 켜기'}
          style={{
            border: 'none',
            background: 'rgba(255,255,255,0.14)',
            color: '#fff',
            borderRadius: 10,
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
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
          <Game
            key={runKey}
            onScore={stableOnScore}
            onGameOver={stableOnGameOver}
            onVariant={stableOnVariant}
          />

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

        <Leaderboard gameId={scoreKey} refreshKey={refreshKey} myEmail={user?.email} />
      </div>
    </div>
  )
}
