/** 소리톡 공통 사용자 (weekly User 와 호환되는 슈퍼셋) */
export interface AuthUser {
  id: string
  email: string
  parentPassword?: string
  isPremium?: boolean
}

export interface AuthResult {
  token: string
  user: AuthUser
}
