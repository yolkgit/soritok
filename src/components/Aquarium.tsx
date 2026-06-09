import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

/** 책상 위 어항 — 관상어 도감 */
export default function Aquarium({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="tank-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <div className="tank">
        <div className="tank__water">
          <span className="fish fish--1">🐠</span>
          <span className="fish fish--2">🐟</span>
          <span className="bubble bubble--1" />
          <span className="bubble bubble--2" />
          <span className="bubble bubble--3" />
          <span className="plant plant--1" />
          <span className="plant plant--2" />
        </div>
        <div className="tank__gravel" aria-hidden />
        <div className="tank__glass" aria-hidden />
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
