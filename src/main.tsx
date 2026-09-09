import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { redirectProductionAliasToCanonicalOrigin } from './utils/canonicalAppOrigin.ts'

if (!redirectProductionAliasToCanonicalOrigin()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
