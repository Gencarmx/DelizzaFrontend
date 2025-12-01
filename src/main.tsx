import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@presentation/styles/global.css'
import Home from '@presentation/pages/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
