import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@soritok/auth'
import { AdsProvider, Ads } from '@soritok/ads'
import '@soritok/ui/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AdsProvider>
        {/* 허브는 '집'이라 BrandHome(홈 링크) 없이 계정/로그인만 노출.
            AccountBar 는 App.tsx 안에서 렌더됩니다. */}
        <Ads />
        <App />
      </AdsProvider>
    </AuthProvider>
  </StrictMode>,
)
