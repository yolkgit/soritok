import type { AuthResult, AuthUser } from './types'

/**
 * 인증 API 베이스 주소. weekly 의 services/api.ts 와 동일 규칙:
 *  - VITE_API_URL 가 있으면 그것
 *  - localhost 개발이면 weekly 백엔드(:4000)
 *  - 그 외(프로덕션 단일 오리진)면 같은 오리진의 /api
 */
export function apiBase(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env
  if (env?.VITE_API_URL) return env.VITE_API_URL
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    return 'http://localhost:4000/api'
  }
  return '/api'
}

async function asJson(res: Response): Promise<Record<string, unknown>> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || '요청에 실패했어요')
  }
  return data as Record<string, unknown>
}

export const authApi = {
  login: (email: string, password: string): Promise<AuthResult> =>
    fetch(`${apiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(asJson) as Promise<AuthResult>,

  signup: (email: string, password: string): Promise<AuthResult> =>
    fetch(`${apiBase()}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(asJson) as Promise<AuthResult>,

  me: (token: string): Promise<AuthUser> =>
    fetch(`${apiBase()}/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(asJson) as Promise<AuthUser>,
}
