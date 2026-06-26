import type React from 'react'

export interface GameProps {
  /** 점수가 바뀔 때마다 호출 (실시간 표시용) */
  onScore: (score: number) => void
  /** 게임 종료 시 최종 점수와 함께 호출 */
  onGameOver: (score: number) => void
  /** (선택) 기록 키 세분화 — 리듬게임 곡별 순위 등. game.id::variant 로 스코프됨 */
  onVariant?: (variant: string | null) => void
}

export interface GameDef {
  id: string
  title: string
  emoji: string
  color: string
  desc: string
  scoreLabel: string
  Component: React.ComponentType<GameProps>
  /** 게임이 자체 배경음을 재생하면 GameShell 공용 배경음을 끔(예: 리듬게임) */
  ownMusic?: boolean
}

export interface LeaderRow {
  rank: number
  name: string
  score: number
  me?: boolean
}
