import type { Service } from '../types'

interface Props {
  service: Service
  onPick: (service: Service) => void
}

export default function StickyNote({ service, onPick }: Props) {
  return (
    <button
      type="button"
      className="note-item"
      onClick={() => onPick(service)}
      aria-label={`${service.title} — ${service.subtitle}`}
    >
      <div className="note">
        <span className="note__tape" aria-hidden />
        <span className="note__emoji">{service.emoji}</span>
        <span className="note__title">{service.title}</span>
        <span className="note__sub">준비중</span>
      </div>
    </button>
  )
}
