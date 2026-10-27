import { useState } from 'react'
import { GAMES, getGame } from './games'
import GameShell from './components/GameShell'
import { audio } from './lib/audio'

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)
  const game = selected ? getGame(selected) : undefined

  if (game) {
    return <GameShell game={game} onExit={() => setSelected(null)} />
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 90px', textAlign: 'center' }}>
      <h1 className="games-page-title">소리톡 게임</h1>
      <section aria-labelledby="arcade-title" className="arcade-section">
        <h2 id="arcade-title" style={{ fontSize: 'clamp(34px, 7vw, 56px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
          🕹️ 아케이드 게임
        </h2>
        <p style={{ opacity: 0.75, marginTop: 10, fontSize: 'clamp(14px,2.4vw,17px)' }}>
          오락실의 재미를 브라우저에서 바로 즐겨보세요.
        </p>
        <a href="https://daytona.soritok.com/racing/" className="arcade-game-card">
          <span className="arcade-game-icon" aria-hidden="true">🏎️</span>
          <span className="arcade-game-info">
            <strong>데이토나</strong>
            <span>3D 레이싱 · 키보드 조작 · 최대 4인 온라인</span>
          </span>
          <span className="arcade-game-play">플레이 <span aria-hidden="true">→</span></span>
        </a>
      </section>

      <h2 style={{ fontSize: 'clamp(34px, 7vw, 56px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
        🎮 미니 게임
      </h2>
      <p style={{ opacity: 0.75, marginTop: 10, fontSize: 'clamp(14px,2.4vw,17px)' }}>
        간단하지만 중독성 있는 게임 26종. 로그인하면 전역 랭킹에서 경쟁할 수 있어요!
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
            onClick={() => {
              audio.unlock()
              audio.play('click')
              setSelected(g.id)
            }}
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
