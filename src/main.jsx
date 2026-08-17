import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}

// Service worker: register only in production builds. In dev, unregister any
// stale workers and clear caches so Vite's fresh JS chunks aren't shadowed by
// cached ones (which causes React/ReactDOM mismatch -> "Cannot read properties
// of null (reading 'useState')").
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => {
        if (window.caches && typeof window.caches.keys === 'function') {
          return window.caches.keys().then((keys) =>
            Promise.all(keys.map((k) => window.caches.delete(k)))
          );
        }
      })
      .catch(() => {});
  } else {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    );
  }
}