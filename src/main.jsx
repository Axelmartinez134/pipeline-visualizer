import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './app/routes/AppRoutes.tsx'
import { AuthProvider } from './app/auth/AuthContext.tsx'
// Ensure ESM libs are set up (provides window.THREE/window.gsap for legacy code)
import './esmSetup.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
) 