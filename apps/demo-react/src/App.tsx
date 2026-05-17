import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SwapPage from './pages/SwapPage'
import MultiChainPage from './pages/MultiChainPage'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/swap" element={<SwapPage />} />
      <Route path="/multichain" element={<MultiChainPage />} />
      <Route path="/auth" element={<AuthPage />} />
    </Routes>
  )
}

export default App
