import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Buffer } from 'buffer'
import process from 'process'
import { BrowserRouter } from 'react-router-dom'

// Оновлення глобальних змінних
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = process
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
