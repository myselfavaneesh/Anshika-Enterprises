import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA support with Auto-Update feature
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
        // Automatically check for updates when user opens or returns to app
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update deployed on server! Automatically update client
                console.log('New updates detected! Refreshing for latest version...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((err) => console.warn('Service Worker registration error:', err));
  });
}

