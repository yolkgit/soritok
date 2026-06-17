import React, { useEffect, useState } from 'react'
import { useAds, adsVisible } from './AdsProvider'
import { ensureAdStyles } from './styles'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const AdInterstitial: React.FC<Props> = ({ isOpen, onClose }) => {
  const { config, isPremium } = useAds()
  const configTimer = parseInt(config['AD_INTERSTITIAL_TIMER'] || '3', 10)
  const width = config['AD_INTERSTITIAL_WIDTH'] || '512'
  const height = config['AD_INTERSTITIAL_HEIGHT'] || '512'

  const [timer, setTimer] = useState(configTimer)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => ensureAdStyles(), [])

  useEffect(() => {
    if (!isOpen || isPremium) return
    setTimer(configTimer)
    setCanClose(configTimer <= 0)
    if (configTimer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanClose(true)
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isOpen, configTimer, isPremium])

  if (!isOpen || !adsVisible(config, isPremium)) return null

  const adCode = config['COUPANG_INTERSTITIAL_HTML'] || config['ADSENSE_INTERSTITIAL_ID'] || ''

  return (
    <div
      className="stk-ad-interstitial"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
        animation: 'stk-fade-in 0.2s ease',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 24,
          width: width.includes('%') ? width : `${width}px`,
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
          잠시 광고를 보고 가실게요! 🙇‍♂️
        </h3>

        <div
          style={{
            width: '100%',
            background: '#f1f5f9',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            marginBottom: 24,
            overflow: 'hidden',
            height: height.includes('%') ? height : `${height}px`,
            maxHeight: 'calc(100vh - 15rem)',
          }}
        >
          {adCode ? (
            <div
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: adCode }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 16 }}>
              <p style={{ margin: 0 }}>전면 광고 영역</p>
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>광고 코드가 설정되지 않았습니다</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={!canClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            fontWeight: 700,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: canClose ? 'pointer' : 'not-allowed',
            background: canClose ? '#4f46e5' : '#e2e8f0',
            color: canClose ? '#fff' : '#94a3b8',
          }}
        >
          {canClose ? '닫고 계속하기 ✕' : `${timer}초 뒤에 닫을 수 있어요`}
        </button>

        <div style={{ marginTop: 16, fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
          이 포스팅은 쿠팡 파트너스 활동의 일환으로,
          <br />
          이에 따른 일정액의 수수료를 제공받습니다.
        </div>
      </div>
    </div>
  )
}
