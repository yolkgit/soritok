import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider, AccountBar} from '@soritok/auth';
import {AdsProvider, Ads} from '@soritok/ads';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AdsProvider>
        <AccountBar brand="소리톡" />
        <Ads />
        <App />
      </AdsProvider>
    </AuthProvider>
  </StrictMode>,
);
