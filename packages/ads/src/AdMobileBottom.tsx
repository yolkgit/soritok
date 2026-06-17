import React, { useEffect } from 'react'
import { useAds, adsVisible } from './AdsProvider'
import { ensureAdStyles } from './styles'

export const AdMobileBottom: React.FC = () => {
  const { config, isPremium } = useAds()
  useEffect(() => ensureAdStyles(), [])

  if (!adsVisible(config, isPremium)) return null

  const wrap: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 40,
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 60,
  }

  return (
    <div className="stk-ad-mobile" style={wrap}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {config['COUPANG_MOBILE_HTML'] ? (
          <div
            dangerouslySetInnerHTML={{ __html: config['COUPANG_MOBILE_HTML'] }}
            style={{ width: '100%', maxWidth: 384, display: 'flex', justifyContent: 'center', transform: 'scale(0.9)' }}
          />
        ) : config['ADSENSE_MOBILE_ID'] ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 8 }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Google AdSense</p>
            <p style={{ marginTop: 4, fontSize: 10, wordBreak: 'break-all' }}>
              {config['ADSENSE_MOBILE_ID']}
            </p>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: 60,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            모바일 하단 배너 설정 필요
          </div>
        )}
      </div>
    </div>
  )
}
