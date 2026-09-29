import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Synchronously purge all dummy/seed projects from localStorage before React mounts
if (typeof window !== 'undefined') {
  try {
    const rawProjs = localStorage.getItem('booshnam_projects_v2');
    if (rawProjs) {
      const parsed = JSON.parse(rawProjs);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter((p: any) => 
          !p.id?.startsWith('proj-') &&
          !['Prestige Boulevard', 'Royal Palm', 'Green Valley', 'Sunrise Industrial', 'Urban Metro', 'Skyline Contemporary', 'Heritage Courtyard', 'Highway Overpass', 'Government Medical College', 'High-Rise Commercial', 'Coastal Highway'].some(t => (p.name || p.title || p.client_name || '').includes(t))
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem('booshnam_projects_v2', JSON.stringify(clean));
        }
      }
    }

    // Clean any keys with mock proj- ids
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('proj-') || key.includes('proj_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  // Intercept browser window.alert to always display modern in-app notifications
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

import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

