import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

/** 벽에 걸린 액자 그림 — 건강&슬로우러닝(슬로우7) */
export default function PictureFrame({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="frame-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <span className="board-hook" aria-hidden />
      <div className="frame">
        <div className="frame__mat">
          <div className="frame__art" aria-hidden>
            <span className="frame__sun" />
            <span className="frame__hill frame__hill--far" />
            <span className="frame__hill frame__hill--near" />
            <span className="frame__title">
              슬로우<em>7</em>
            </span>
            <span className="frame__runner">🏃</span>
          </div>
        </div>
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
