import React, { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { authApi } from './client'

interface Props {
  open: boolean
  onClose: () => void
  brand?: string
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'rgba(28,18,8,0.55)',
    backdropFilter: 'blur(3px)',
    fontFamily:
      "var(--stk-font, 'Pretendard', system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif)",
  },
  card: {
    position: 'relative',
    width: 'min(380px, 100%)',
    background: 'var(--stk-surface, #fffaf2)',
    borderRadius: 20,
    padding: '34px 28px 26px',
    boxShadow: 'var(--stk-shadow-lg, 0 30px 60px rgba(0,0,0,0.35))',
    borderTop: '8px solid var(--stk-brand, #e8743b)',
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 14,
    border: 'none',
    background: 'transparent',
    fontSize: 18,
    color: '#b0a08c',
    cursor: 'pointer',
    lineHeight: 1,
  },
  title: { margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--stk-ink, #3a2c1d)' },
  sub: { margin: '0 0 20px', color: 'var(--stk-ink-soft, #7a5c3e)', fontSize: 14 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#5f4d3b',
    margin: '0 0 6px',
  },
  input: {
    width: '100%',
    padding: '11px 13px',
    border: '1px solid #e3d8c4',
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 14,
    background: '#fff',
    boxSizing: 'border-box',
  },
  error: {
    background: '#fdecec',
    color: '#c0392b',
    padding: '9px 12px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
  },
  submit: {
    width: '100%',
    background:
      'linear-gradient(135deg, var(--stk-brand, #e8743b), var(--stk-brand-strong, #d65f28))',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    padding: '13px',
    border: 'none',
    borderRadius: 999,
    cursor: 'pointer',
  },
  toggle: {
    marginTop: 18,
    textAlign: 'center' as const,
    fontSize: 13,
  },
  toggleBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--stk-brand-strong, #c95a22)',
    fontWeight: 700,
    cursor: 'pointer',
  },
}

export const LoginModal: React.FC<Props> = ({ open, onClose, brand = '소리톡' }) => {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = isLogin
        ? await authApi.login(email, password)
        : await authApi.signup(email, password)
      login(data.token, data.user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증에 실패했어요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <button style={S.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2 style={S.title}>{isLogin ? '로그인' : '회원가입'}</h2>
        <p style={S.sub}>하나의 계정으로 {brand}의 모든 서비스를 이용하세요</p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={submit}>
          <label style={S.label}>이메일</label>
          <input
            style={S.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
          <label style={S.label}>비밀번호</label>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button style={S.submit} type="submit" disabled={loading}>
            {loading ? '처리 중…' : isLogin ? '로그인' : '가입하기'}
          </button>
        </form>

        <div style={S.toggle}>
          <button style={S.toggleBtn} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}
