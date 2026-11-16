import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { DuplicateFiles } from './components/DuplicateFiles'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-4">
          <Routes>
            <Route path="/" element={<Navigate to="/duplicados" replace />} />
            <Route path="/duplicados" element={<DuplicateFiles />} />
            <Route path="*" element={<Navigate to="/duplicados" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}