import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, AccountBar } from '@soritok/auth'
import { AdsProvider, Ads } from '@soritok/ads'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AdsProvider>
        <AccountBar brand="소리톡 64유형 MBTI" />
        <Ads />
        <App />
      </AdsProvider>
    </AuthProvider>
  </StrictMode>,
)
