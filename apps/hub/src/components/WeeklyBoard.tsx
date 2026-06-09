import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

// 종이에 그려진 가짜 일정 블록 (요일별 색 막대) — 실제 계획표처럼 보이게
const TASKS: string[][] = [
  ['#F6A23C'],
  ['#7EC96B', '#6AA9F0'],
  ['#F6837F'],
  ['#9B8CF0'],
  ['#6AA9F0'],
  ['#7EC96B'],
  [],
]

export default function WeeklyBoard({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="board-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <span className="board-hook" aria-hidden />
      <div className="board">
        <div className="board__paper">
          <div className="paper__head">
            <span className="paper__brand">WEEKLY</span>
            <span className="paper__sub">주간 계획표</span>
          </div>
          <div className="paper__grid">
            {DAYS.map((d, i) => (
              <div className="paper__col" key={d}>
                <span className="paper__day">{d}</span>
                <span className="paper__cell">
                  {TASKS[i].map((c, k) => (
                    <span
                      className="paper__bar"
                      key={k}
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <span className="pin pin--l" aria-hidden />
        <span className="pin pin--r" aria-hidden />
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
