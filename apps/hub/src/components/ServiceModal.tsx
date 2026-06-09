import { useEffect } from 'react'
import type { Service } from '../types'

interface Props {
  service: Service | null
  onClose: () => void
}

export default function ServiceModal({ service, onClose }: Props) {
  // ESC로 닫기
  useEffect(() => {
    if (!service) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [service, onClose])

  if (!service) return null

  const isComingSoon = service.status === 'coming-soon'

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal__card"
        style={{ ['--accent' as string]: service.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className="modal__emoji">{service.emoji}</div>
        <h2 className="modal__title">{service.title}</h2>
        <p className="modal__subtitle">{service.subtitle}</p>
        <p className="modal__desc">{service.description}</p>

        {isComingSoon ? (
          <button className="modal__cta modal__cta--disabled" disabled>
            준비중이에요
          </button>
        ) : (
          <a
            className="modal__cta"
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            서비스 열기 →
          </a>
        )}
      </div>
    </div>
  )
}
