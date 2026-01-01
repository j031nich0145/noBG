import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NoBG from './pages/NoBG'
import NoBGBatch from './pages/NoBGBatch'
import Layout from './components/Layout'
import './App.css'

function App() {
  // Set basename only in production (for GitHub Pages)
  const basename = import.meta.env.PROD ? '/noBG' : '/'
  
  return (
    <BrowserRouter basename={basename}>
      <Layout>
        <Routes>
          <Route path="/" element={<NoBG />} />
          <Route path="/batch" element={<NoBGBatch />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

