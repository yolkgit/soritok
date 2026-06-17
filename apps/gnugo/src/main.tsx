import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider, AccountBar} from '@soritok/auth';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AccountBar brand="소리톡" />
      <App />
    </AuthProvider>
  </StrictMode>,
);
