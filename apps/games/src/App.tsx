import { useState } from 'react'
import { GAMES, getGame } from './games'
import GameShell from './components/GameShell'

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)
  const game = selected ? getGame(selected) : undefined

  if (game) {
    return <GameShell game={game} onExit={() => setSelected(null)} />
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 90px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 'clamp(34px, 7vw, 56px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
        🎮 미니 게임
      </h1>
      <p style={{ opacity: 0.75, marginTop: 10, fontSize: 'clamp(14px,2.4vw,17px)' }}>
        간단하지만 중독성 있는 게임 5종. 로그인하면 전역 랭킹에서 경쟁할 수 있어요!
      </p>

      <div
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 18,
        }}
      >
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: 18,
              padding: '26px 16px',
              background: 'rgba(255,255,255,0.07)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              boxShadow: `inset 0 0 0 2px ${g.color}33`,
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            }}
          >
            <span style={{ fontSize: 46 }}>{g.emoji}</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: g.color }}>{g.title}</span>
            <span style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.4 }}>{g.desc}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
