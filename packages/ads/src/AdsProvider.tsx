import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiBase, authApi, useAuth } from '@soritok/auth'

export type AdConfig = Record<string, string>

interface AdsContextValue {
  config: AdConfig
  isPremium: boolean
  ready: boolean
}

const AdsContext = createContext<AdsContextValue>({
  config: {},
  isPremium: false,
  ready: false,
})

/**
 * 광고 설정을 weekly 백엔드의 공개 설정(/api/public/config)에서 불러오고,
 * 로그인 사용자의 프리미엄 여부(/api/user/me)를 확인해 광고 노출을 제어합니다.
 * 백엔드가 없거나 실패하면 config={} → 광고 미노출(안전).
 */
export const AdsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  const [config, setConfig] = useState<AdConfig>({})
  const [isPremium, setIsPremium] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase()}/public/config`)
        const data = res.ok ? ((await res.json()) as AdConfig) : {}
        if (!cancelled) setConfig(data || {})
      } catch {
        if (!cancelled) setConfig({})
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setIsPremium(false)
      return
    }
    ;(async () => {
      try {
        const me = await authApi.me(token)
        if (!cancelled) setIsPremium(!!me.isPremium)
      } catch {
        if (!cancelled) setIsPremium(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <AdsContext.Provider value={{ config, isPremium, ready }}>
      {children}
    </AdsContext.Provider>
  )
}

export function useAds(): AdsContextValue {
  return useContext(AdsContext)
}

/** 광고를 노출해도 되는지 (설정 on + 비프리미엄) */
export function adsVisible(config: AdConfig, isPremium: boolean): boolean {
  return config['ADS_ENABLED'] === 'true' && !isPremium
}
