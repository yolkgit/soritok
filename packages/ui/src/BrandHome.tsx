import React from 'react'

interface Props {
  /** 클릭 시 이동할 주소 (기본: 허브 '/') */
  href?: string
  /** 표시 라벨 (기본: 소리톡) */
  label?: string
}

const S: Record<string, React.CSSProperties> = {
  link: {
    position: 'fixed',
    top: 14,
    left: 16,
    zIndex: 900,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    textDecoration: 'none',
    background: 'rgba(255, 250, 242, 0.92)',
    color: 'var(--stk-ink, #3a2c1d)',
    border: '1px solid var(--stk-line, #e8ddc9)',
    borderRadius: 'var(--stk-radius-pill, 999px)',
    padding: '7px 14px 7px 12px',
    fontFamily:
      "var(--stk-font, 'Pretendard', system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif)",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '-0.2px',
    boxShadow: 'var(--stk-shadow-sm, 0 3px 8px rgba(58,32,12,0.12))',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    cursor: 'pointer',
  },
  mark: {
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background:
      'linear-gradient(135deg, var(--stk-brand, #e8743b), var(--stk-brand-strong, #d65f28))',
    color: '#fff',
    fontSize: 12,
    lineHeight: 1,
    boxShadow: '0 2px 5px var(--stk-brand-ring, rgba(232,116,59,0.35))',
  },
}

/**
 * 어느 앱에서든 좌상단에 "🔊 소리톡" 홈 링크를 띄웁니다.
 * 단일 오리진 배포에서 '/' 는 허브(책상)입니다.
 * 인증 컨텍스트가 필요 없어 weekly 등 모든 앱에서 동일하게 사용할 수 있습니다.
 */
export const BrandHome: React.FC<Props> = ({ href = '/', label = '소리톡' }) => (
  <a href={href} style={S.link} aria-label={`${label} 홈으로`}>
    <span style={S.mark} aria-hidden>
      🔊
    </span>
    {label}
  </a>
)
