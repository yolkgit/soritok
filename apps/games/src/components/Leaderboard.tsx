import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/scores'
import type { LeaderRow } from '../types'

interface Props {
  gameId: string
  /** 갱신 트리거 (점수 제출 후 증가시키면 새로고침) */
  refreshKey?: number
  myEmail?: string | null
}

export default function Leaderboard({ gameId, refreshKey, myEmail }: Props) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    fetchLeaderboard(gameId, 10).then((r) => !cancelled && setRows(r))
    return () => {
      cancelled = true
    }
  }, [gameId, refreshKey])

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 16,
        minWidth: 230,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 15 }}>🏆 명예의 전당</div>
      {rows === null ? (
        <p style={{ opacity: 0.6, fontSize: 13 }}>불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p style={{ opacity: 0.6, fontSize: 13, lineHeight: 1.6 }}>
          아직 기록이 없어요.
          <br />
          로그인하고 첫 기록의 주인공이 되어보세요!
        </p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((r) => {
            const mine = !!myEmail && r.name === myEmail
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}`
            return (
              <li
                key={r.rank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: mine ? 'rgba(124,255,155,0.16)' : 'transparent',
                  fontWeight: mine ? 800 : 500,
                }}
              >
                <span style={{ width: 24, textAlign: 'center' }}>{medal}</span>
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                  }}
                >
                  {r.name.split('@')[0]}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                  {r.score.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
