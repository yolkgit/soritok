import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

// 9줄 바둑판. 좌표 변환: 격자 간격 40, 여백 20
const LINES = 9
const pos = (i: number) => 20 + 40 * i
const STARS: [number, number][] = [
  [2, 2],
  [2, 6],
  [6, 2],
  [6, 6],
  [4, 4],
]
// 진행 중인 듯한 돌 배치 (b=흑, w=백)
const STONES: { x: number; y: number; c: 'b' | 'w' }[] = [
  { x: 2, y: 2, c: 'b' },
  { x: 4, y: 3, c: 'w' },
  { x: 6, y: 5, c: 'b' },
  { x: 6, y: 2, c: 'w' },
  { x: 2, y: 6, c: 'b' },
  { x: 4, y: 6, c: 'w' },
  { x: 4, y: 4, c: 'b' },
]

export default function GoBoard({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="goban-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <div className="goban">
        <svg className="goban__grid" viewBox="0 0 360 360" aria-hidden>
          <defs>
            <radialGradient id="stoneB" cx="36%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#6b6b6b" />
              <stop offset="38%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="stoneW" cx="36%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#ededed" />
              <stop offset="100%" stopColor="#c4c4c4" />
            </radialGradient>
          </defs>

          {/* 격자 */}
          {Array.from({ length: LINES }).map((_, i) => (
            <g key={i} className="goban__line">
              <line x1={pos(i)} y1={pos(0)} x2={pos(i)} y2={pos(LINES - 1)} />
              <line x1={pos(0)} y1={pos(i)} x2={pos(LINES - 1)} y2={pos(i)} />
            </g>
          ))}

          {/* 화점 */}
          {STARS.map(([c, r], k) => (
            <circle key={k} cx={pos(c)} cy={pos(r)} r={3.2} className="goban__star" />
          ))}

          {/* 돌 */}
          {STONES.map((s, k) => (
            <g key={k}>
              <ellipse
                cx={pos(s.x)}
                cy={pos(s.y) + 3}
                rx={16}
                ry={6}
                fill="rgba(0,0,0,.28)"
              />
              <circle
                cx={pos(s.x)}
                cy={pos(s.y)}
                r={16.5}
                fill={`url(#${s.c === 'b' ? 'stoneB' : 'stoneW'})`}
              />
            </g>
          ))}
        </svg>
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
