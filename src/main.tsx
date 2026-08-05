import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle unhandled rejections and errors caused by browser extensions (e.g. MetaMask, Wallet extensions)
if (typeof window !== 'undefined') {
  const isExtensionError = (err: any) => {
    const str = (err?.message || err?.stack || String(err || '')).toLowerCase();
    return (
      str.includes('metamask') ||
      str.includes('ethereum') ||
      str.includes('web3') ||
      str.includes('wallet') ||
      str.includes('failed to connect') ||
      str.includes('user rejected')
    );
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isExtensionError(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        console.warn('Suppressed browser extension rejection:', event.reason);
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      if (isExtensionError(event.error) || isExtensionError(event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        console.warn('Suppressed browser extension error:', event.message);
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

