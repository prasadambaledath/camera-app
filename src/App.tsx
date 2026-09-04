import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { MemoryLoadPanel } from './components/MemoryLoadPanel'
import { MemoryLoadProvider } from './memory/MemoryLoadProvider'
import { DeviceCamera } from './pages/DeviceCamera'
import { Home } from './pages/Home'
import { InAppCamera } from './pages/InAppCamera'
import './App.css'

function ExperimentPanel() {
  const { pathname } = useLocation()
  if (pathname === '/') return null
  return <MemoryLoadPanel />
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <MemoryLoadProvider>
        <div className="app">
          <Header />
          <main className="app__main">
            <ExperimentPanel />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/device" element={<DeviceCamera />} />
              <Route path="/in-app" element={<InAppCamera />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </MemoryLoadProvider>
    </BrowserRouter>
  )
}

export default App
