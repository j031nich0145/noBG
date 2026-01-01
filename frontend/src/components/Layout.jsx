import { useState } from 'react'
import { Link } from 'react-router-dom'
import InfoModal from './InfoModal'
import './Layout.css'

function Layout({ children }) {
  const [showInfoModal, setShowInfoModal] = useState(false)

  return (
    <div className="app-wrapper">
      {/* Page Content */}
      <div className="page-content">
        {children}
      </div>
      
      {/* Shared Footer */}
      <footer className="app-footer">
        <button 
          className="footer-info-button" 
          onClick={() => setShowInfoModal(true)}
          title="App Usage Guide"
        >
          ⓘ
        </button>
        <span className="footer-separator">•</span>
        <a href="#" className="footer-link">Pixelation Tool</a>
        <span className="footer-separator">•</span>
        <a href="https://github.com/j031nich0145/j031nich0145/blob/main/LICENSING.md" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="footer-link">
          Commercial Use License
        </a>
        <span className="footer-separator">•</span>
        <a href="https://github.com/j031nich0145/j031nich0145/" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="footer-link">
          Buy Us Coffee
        </a>
      </footer>

      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  )
}

export default Layout

