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

    // Synchronously purge all legacy dummy/seed transactions, invoices, and subcon orders
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('siteops_project_invoices_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((inv: any) => !(
                inv.id?.startsWith('inv-seed-67') ||
                (inv.invoice_number === 'INV-67' && inv.boq_number === 'Sales-62')
              ));
              if (clean.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(clean));
              }
            }
          }
        } catch (e) {}
      }

      if (key.startsWith('booshnam_subcon_workorders_v2_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((wo: any) => !(
                wo.id === 'wo-seed-62' ||
                wo.id?.startsWith('wo-seed-') ||
                (wo.wo_number === '#WO--62' && wo.subcon_name === 'PRASATH')
              ));
              if (clean.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(clean));
              }
            }
          }
        } catch (e) {}
      }

      if (key.startsWith('siteops_project_transactions_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((tx: any) => !(
                tx.id?.includes('seed-') ||
                (tx.transaction_number === '#65' && tx.party_name === 'PRASATH') ||
                (tx.transaction_number === '#INV-67' && tx.party_name === 'Jisha Jeevan Buildtech')
              ));
              if (clean.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(clean));
              }
            }
          }
        } catch (e) {}
      }

      if (key.startsWith('siteops_project_expenses_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((exp: any) => !(
                exp.id?.includes('seed-') ||
                (exp.voucher_no === '#65' && exp.party_name === 'PRASATH')
              ));
              if (clean.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(clean));
              }
            }
          }
        } catch (e) {}
      }
    }
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

