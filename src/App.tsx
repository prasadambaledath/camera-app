import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { DeviceCamera } from './pages/DeviceCamera'
import { InAppCamera } from './pages/InAppCamera'
import './App.css'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app">
        <Header />
        <main className="app__main">
          <Routes>
            <Route path="/" element={<DeviceCamera />} />
            <Route path="/in-app" element={<InAppCamera />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
