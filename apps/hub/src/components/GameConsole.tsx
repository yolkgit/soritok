import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

/** 휴대용 게임기 — 미니 게임 */
export default function GameConsole({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="console-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <div className="console" style={{ ['--c' as string]: service.color }}>
        <div className="console__screen">
          <span className="console__art">{service.emoji}</span>
        </div>
        <div className="console__controls">
          <span className="console__dpad" aria-hidden />
          <span className="console__buttons" aria-hidden>
            <i />
            <i />
          </span>
        </div>
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
