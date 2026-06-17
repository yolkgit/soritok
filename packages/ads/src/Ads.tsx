import React from 'react'
import { AdSidebar } from './AdSidebar'
import { AdMobileBottom } from './AdMobileBottom'

/**
 * 상시 배너 광고 묶음 — 앱에서 한 번만 배치하면
 * 데스크톱 좌/우 사이드바 + 모바일 하단 배너가 자동 노출됩니다.
 * (노출 여부는 AdsProvider 설정/프리미엄에 따라 자동 결정)
 */
export const Ads: React.FC = () => (
  <>
    <AdSidebar side="left" />
    <AdSidebar side="right" />
    <AdMobileBottom />
  </>
)
