import { useState } from 'react'
import { AlertCircle, Clock, FileText, Search } from 'lucide-react'
import { findDuplicateFiles, handleApiError } from '@/services/api'
import type { DuplicateFileResponse } from '@/types'

export const DuplicateFiles = () => {
  const [searchPath, setSearchPath] = useState('')
  const [files, setFiles] = useState<DuplicateFileResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(2))} ${units[unitIndex]}`
  }

  const searchDuplicates = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFiles(null)

    try {
      const results = await findDuplicateFiles(searchPath.trim() || undefined)
      setFiles(results)
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.detail || 'Erro ao buscar arquivos duplicados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <Search className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900">Arquivos Duplicados</h1>
      </div>

      <form onSubmit={searchDuplicates} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <label htmlFor="duplicate-search-path" className="block text-sm font-medium text-slate-700 mb-2">
            Caminho relativo da pasta (opcional)
          </label>
          <input
            id="duplicate-search-path"
            type="text"
            value={searchPath}
            onChange={(event) => setSearchPath(event.target.value)}
            placeholder="Deixe vazio para pesquisar na pasta configurada"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="self-end px-6 py-2 flex items-center justify-center gap-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Buscando...' : 'Buscar duplicados'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h2 className="text-sm font-medium text-red-800">Erro</h2>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {files !== null && !error && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Resultados</h2>
            <span className="text-xs font-medium text-slate-500">{files.length} arquivos</span>
          </div>

          {files.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum arquivo duplicado encontrado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {files.map((file) => (
                <li key={file.fullPath} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm font-medium text-slate-900">{file.name}</span>
                    <span className="text-xs text-slate-500">{formatBytes(file.sizeInBytes)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 break-all">{file.fullPath}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Modificado em {new Date(file.lastModifiedUtc).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {files === null && !error && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Informe uma pasta (ou deixe em branco) e busque arquivos duplicados.</p>
        </div>
      )}
    </div>
  )
}
