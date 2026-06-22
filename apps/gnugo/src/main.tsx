import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider, AccountBar} from '@soritok/auth';
import {AdsProvider, Ads} from '@soritok/ads';
import {BrandHome} from '@soritok/ui';
import '@soritok/ui/tokens.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AdsProvider>
        <BrandHome />
        <AccountBar />
        <Ads />
        <App />
      </AdsProvider>
    </AuthProvider>
  </StrictMode>,
);
