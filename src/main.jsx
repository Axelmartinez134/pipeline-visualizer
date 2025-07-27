import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import EmbedApp from './EmbedApp.jsx'
import './index.css'

// Simple URL routing without React Router
function AppRouter() {
  const path = window.location.pathname
  
  // Route to embed page for /offerings
  if (path === '/offerings') {
    return <EmbedApp />
  }
  
  // Default to main app for all other routes (including /)
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
) 