import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

/** 책장에 꽂히는 책 한 권 (책등) */
export default function Spine({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="spine"
      style={{ ['--c' as string]: service.color }}
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <span className="spine__emoji">{service.emoji}</span>
      <span className="spine__title">{service.title}</span>
      <span className="spine__shine" aria-hidden />
    </button>
  )
}
