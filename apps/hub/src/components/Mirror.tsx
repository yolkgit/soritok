import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

/** 책상 위 손거울 — 64유형 MBTI (나를 비춰보는 테스트) */
export default function Mirror({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="mirror-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <div className="mirror" style={{ ['--c' as string]: service.color }}>
        <div className="mirror__glass">
          <span className="mirror__shine" aria-hidden />
          <span className="mirror__art">{service.emoji}</span>
        </div>
        <span className="mirror__handle" aria-hidden />
      </div>
      <span className="object-label" style={{ ['--c' as string]: service.color }}>
        {service.title}
      </span>
    </button>
  )
}
