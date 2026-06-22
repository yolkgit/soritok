import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { LoginModal } from './LoginModal'

interface Props {
  /** 모달에 표시할 브랜드명 */
  brand?: string
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 14,
    right: 16,
    zIndex: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily:
      "var(--stk-font, 'Pretendard', system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif)",
  },
  loginBtn: {
    background:
      'linear-gradient(135deg, var(--stk-brand, #e8743b), var(--stk-brand-strong, #d65f28))',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 10px var(--stk-brand-ring, rgba(232,116,59,0.35))',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,250,242,0.92)',
    border: '1px solid var(--stk-line, #e8ddc9)',
    borderRadius: 999,
    padding: '6px 8px 6px 14px',
    boxShadow: 'var(--stk-shadow-sm, 0 3px 8px rgba(58,32,12,0.12))',
  },
  email: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--stk-ink, #45331f)',
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'var(--stk-brand-soft, #efe2d2)',
    color: 'var(--stk-brand-deep, #6b4a2a)',
    border: 'none',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

/** 어느 앱에서든 한 번 렌더하면 우상단에 로그인/계정 상태가 표시됩니다. */
export const AccountBar: React.FC<Props> = ({ brand = '소리톡' }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div style={S.wrap}>
        {isAuthenticated ? (
          <div style={S.chip}>
            <span style={S.email}>{user?.email ?? '내 계정'}</span>
            <button style={S.logoutBtn} onClick={logout}>
              로그아웃
            </button>
          </div>
        ) : (
          <button style={S.loginBtn} onClick={() => setOpen(true)}>
            로그인
          </button>
        )}
      </div>
      <LoginModal open={open} onClose={() => setOpen(false)} brand={brand} />
    </>
  )
}
