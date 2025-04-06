import React from 'react' // Changed from StrictMode for potential effect timing
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './components/ThemeProvider' // Import the provider


createRoot(document.getElementById('root')).render(
  // Using React.Fragment instead of StrictMode temporarily if StrictMode causes
  // double useEffect runs that interfere with theme initialization logic.
  // You can try putting StrictMode back later.
  <React.Fragment>
    <ThemeProvider defaultTheme="system" storageKey="medtracker-theme"> {/* Wrap App */}
      <App />
    </ThemeProvider>
  </React.Fragment>,
)
