import { apiBase } from '@soritok/auth'
import type { LeaderRow } from '../types'

const BEST_KEY = (gameId: string) => `soritok.games.best.${gameId}`

/** 로컬 최고점(비로그인/오프라인 폴백) */
export function getLocalBest(gameId: string): number {
  const v = Number(localStorage.getItem(BEST_KEY(gameId)))
  return Number.isFinite(v) ? v : 0
}

export function setLocalBest(gameId: string, score: number): number {
  const best = Math.max(getLocalBest(gameId), score)
  localStorage.setItem(BEST_KEY(gameId), String(best))
  return best
}

/** 점수 제출(로그인 필요). 실패해도 throw 하지 않고 false 반환. */
export async function submitScore(
  gameId: string,
  score: number,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/games/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ game: gameId, score }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** 게임별 전역 리더보드. 백엔드 없으면 빈 배열. */
export async function fetchLeaderboard(
  gameId: string,
  limit = 10,
): Promise<LeaderRow[]> {
  try {
    const res = await fetch(
      `${apiBase()}/games/leaderboard?game=${encodeURIComponent(gameId)}&limit=${limit}`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as { name: string; score: number }[]
    return data.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score }))
  } catch {
    return []
  }
}
