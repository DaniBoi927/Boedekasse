import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import ErrorBoundary from './ErrorBoundary'

const root = document.getElementById('root')
if (root) createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
