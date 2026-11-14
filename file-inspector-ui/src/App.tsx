import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { FileInspection } from './components/FileInspection'
import { DuplicateFiles } from './components/DuplicateFiles'
import { FolderComparison } from './components/FolderComparison'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-4">
          <Routes>
            <Route path="/" element={<FileInspection />} />
            <Route path="/duplicados" element={<DuplicateFiles />} />
            <Route path="/comparar-pastas" element={<FolderComparison />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}