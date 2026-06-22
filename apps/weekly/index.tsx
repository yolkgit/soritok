import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrandHome } from '@soritok/ui';
import '@soritok/ui/tokens.css';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrandHome />
    <App />
  </React.StrictMode>
);
