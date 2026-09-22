import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept browser window.alert to always display modern in-app notifications
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    window.dispatchEvent(
      new CustomEvent('siteops_toast', {
        detail: {
          title: 'Notification',
          message: String(message || ''),
          type: 'info'
        }
      })
    );
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
