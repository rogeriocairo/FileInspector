import { useState, useCallback } from 'react'
import { Search, Folder, Clock, AlertCircle, Copy, FileText } from 'lucide-react'
import { getFolderFiles, handleApiError } from '@/services/api'
import type { FolderFileResponse } from '@/types'

interface ComparedFile {
  name: string
  left: FolderFileResponse | null
  right: FolderFileResponse | null
}

export const FolderComparison = () => {
  const [leftPath, setLeftPath] = useState('')
  const [rightPath, setRightPath] = useState('')
  const [leftFiles, setLeftFiles] = useState<FolderFileResponse[]>([])
  const [rightFiles, setRightFiles] = useState<FolderFileResponse[]>([])
  const [compared, setCompared] = useState<ComparedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedPaths, setCopiedPaths] = useState<Set<string>>(new Set())

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const compareFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLeftFiles([])
    setRightFiles([])
    setCompared([])

    try {
      const [leftData, rightData] = await Promise.all([
        getFolderFiles(leftPath || undefined),
        getFolderFiles(rightPath || undefined),
      ])

      setLeftFiles(leftData)
      setRightFiles(rightData)

      const leftMap = new Map(leftData.map((f) => [f.name, f]))
      const rightMap = new Map(rightData.map((f) => [f.name, f]))

      const allNames = new Set([...leftData.map((f) => f.name), ...rightData.map((f) => f.name)])
      const comparedList: ComparedFile[] = Array.from(allNames).map((name) => ({
        name,
        left: leftMap.get(name) ?? null,
        right: rightMap.get(name) ?? null,
      }))

      setCompared(comparedList.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.detail || 'Erro ao comparar pastas')
    } finally {
      setLoading(false)
    }
  }, [leftPath, rightPath])

  const copyToClipboard = async (path: string) => {
    await navigator.clipboard.writeText(path)
    setCopiedPaths((prev) => {
      const next = new Set(prev)
      next.add(path)
      setTimeout(() => next.delete(path), 2000)
      return next
    })
  }

  const getFileStatus = (file: ComparedFile): 'match' | 'left-only' | 'right-only' => {
    if (file.left && file.right) return 'match'
    if (file.left) return 'left-only'
    return 'right-only'
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <Folder className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900">Comparação de Pastas</h1>
      </div>
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pasta Esquerda
            </label>
            <input
              type="text"
              value={leftPath}
              onChange={(e) => setLeftPath(e.target.value)}
              placeholder="Caminho relativo da pasta esquerda"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={loading}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pasta Direita
            </label>
            <input
              type="text"
              value={rightPath}
              onChange={(e) => setRightPath(e.target.value)}
              placeholder="Caminho relativo da pasta direita"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={loading}
            />
          </div>
          <button
            onClick={compareFiles}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {' '}
            {loading ? 'Comparando...' : 'Comparar Pastas'}
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            <div className="flex-1 bg-slate-50 p-3 border-r border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  <Folder className="h-4 w-4 mr-1 text-slate-600" />
                  Esquerda
                </h3>
                <span className="text-xs font-medium text-slate-500">{leftFiles.length} itens</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  <Folder className="h-4 w-4 mr-1 text-slate-600" />
                  Direita
                </h3>
                <span className="text-xs font-medium text-slate-500">{rightFiles.length} itens</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {compared.length === 0 && !loading && !error && (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  Insira os caminhos das duas pastas e clique em Comparar Pastas
                </p>
              </div>
            )}

            {compared.map((file) => {
              const status = getFileStatus(file)
              const statusConfig = {
                match: { label: 'Igual', className: 'text-slate-600', bgClass: 'bg-transparent' },
                leftOnly: { label: 'Apenas Esquerda', className: 'text-orange-600', bgClass: 'bg-orange-50' },
                rightOnly: { label: 'Apenas Direita', className: 'text-blue-600', bgClass: 'bg-blue-50' },
              }
              const config = status === 'match' ? statusConfig.match : status === 'left-only' ? statusConfig.leftOnly : statusConfig.rightOnly

              return (
                <div
                  key={file.name}
                  className={`flex px-4 py-3 ${config.bgClass} hover:bg-slate-50 transition-colors`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 truncate max-w-xs" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${config.className}`}>
                        {config.label}
                      </span>
                    </div>
                    {file.left || file.right ? (
                      <div className="flex justify-between mt-1 text-xs text-slate-500">
                        <span>
                          {file.left ? formatBytes(file.left.sizeInBytes) : '—'}
                        </span>
                        <span>
                          {file.right ? formatBytes(file.right.sizeInBytes) : '—'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {file.left && (
                      <button
                        onClick={() => copyToClipboard(file.left.fullPath)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copiar caminho"
                      >
                        {copiedPaths.has(file.left.fullPath) ? (
                          <Copy className="h-3.5 w-3.5" style={{ color: '#16a34a' }} />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {file.right && (
                      <button
                        onClick={() => copyToClipboard(file.right.fullPath)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copiar caminho"
                      >
                        {copiedPaths.has(file.right.fullPath) ? (
                          <Copy className="h-3.5 w-3.5" style={{ color: '#16a34a' }} />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}