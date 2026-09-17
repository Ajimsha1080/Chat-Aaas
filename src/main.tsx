import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

const sentryDsn = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SENTRY_DSN) || ''
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env?.MODE || 'development',
    tracesSampleRate: 0.1,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
