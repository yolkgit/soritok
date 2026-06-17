import React, { useEffect } from 'react'
import { useAds, adsVisible } from './AdsProvider'
import { ensureAdStyles } from './styles'

const unit = (v: string) => (v.endsWith('px') || v.endsWith('%') ? v : `${v}px`)

export const AdSidebar: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const { config, isPremium } = useAds()
  useEffect(() => ensureAdStyles(), [])

  if (!adsVisible(config, isPremium)) return null

  const adCode = config['COUPANG_BANNER_HTML'] || config['ADSENSE_SLOT_ID'] || ''
  const isCoupang = !!config['COUPANG_BANNER_HTML']

  const width = unit(config['AD_SIDEBAR_WIDTH'] || '160')
  const height = unit(config['AD_SIDEBAR_HEIGHT'] || '600')
  const margin = unit(config['AD_SIDEBAR_MARGIN'] || '16')
  const top = unit(config['AD_SIDEBAR_TOP'] || '50%')

  const wrap: React.CSSProperties = {
    position: 'fixed',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    zIndex: 30,
    width,
    height,
    top,
    transform: top.includes('%') ? 'translateY(-50%)' : 'none',
    left: side === 'right' ? `calc(50% + 576px + ${margin})` : 'auto',
    right: side === 'left' ? `calc(50% + 576px + ${margin})` : 'auto',
  }

  return (
    <div className="stk-ad-sidebar" style={wrap}>
      <div
        style={{
          fontSize: 10,
          color: '#94a3b8',
          padding: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: '#f8fafc',
          width: '100%',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        Advertisement
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          overflow: 'hidden',
        }}
      >
        {isCoupang ? (
          <div dangerouslySetInnerHTML={{ __html: adCode }} style={{ transform: 'scale(0.9)' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 16 }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Google AdSense</p>
            <p style={{ marginTop: 8, fontSize: 10, wordBreak: 'break-all' }}>
              {adCode || 'No Ad Code Configured'}
            </p>
          </div>
        )}
      </div>

      {isCoupang && (
        <div
          style={{
            padding: 8,
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            width: '100%',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.3, textAlign: 'center', margin: 0 }}>
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </p>
        </div>
      )}
    </div>
  )
}
