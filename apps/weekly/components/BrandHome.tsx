import React from 'react';

/**
 * 소리톡 공용 좌상단 홈 링크 — weekly 전용 로컬 사본.
 * weekly 는 독립 Dockerfile(api 컨테이너)에서 워크스페이스 없이 단독 빌드되므로
 * @soritok/ui 에 의존하지 않고 같은 모양을 로컬에 둡니다(색은 소리톡 토큰 값 하드코딩).
 */
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
    color: '#3a2c1d',
    border: '1px solid #e8ddc9',
    borderRadius: 999,
    padding: '7px 14px 7px 12px',
    fontFamily:
      "'Pretendard', system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '-0.2px',
    boxShadow: '0 3px 8px rgba(58,32,12,0.12)',
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
    background: 'linear-gradient(135deg, #e8743b, #d65f28)',
    color: '#fff',
    fontSize: 12,
    lineHeight: 1,
    boxShadow: '0 2px 5px rgba(232,116,59,0.35)',
  },
};

export const BrandHome: React.FC = () => (
  <a href="/" style={S.link} aria-label="소리톡 홈으로">
    <span style={S.mark} aria-hidden>
      🔊
    </span>
    소리톡
  </a>
);
