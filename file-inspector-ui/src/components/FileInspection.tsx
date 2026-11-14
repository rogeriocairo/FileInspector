import { useState } from 'react'
import { FileUp, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import { inspectFile, handleApiError } from '@/services/api'
import type { FileInspectionResponse } from '@/types'

export const FileInspection = () => {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<FileInspectionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    setError(null)
    setResult(null)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const response = await inspectFile(file)
      setResult(response)
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.detail || 'Erro ao inspecionar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileUp className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Inspeção de Arquivo</h2>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Selecione um arquivo
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploading}
              />
              {file && (
                <span className="text-sm text-slate-600 truncate max-w-xs">
                  {file.name} ({formatBytes(file.size)})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tamanho máximo: 10 MiB. O arquivo não será persistido no servidor.
            </p>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Inspecionar Arquivo
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 p-6 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Inspeção Concluída</h3>
                <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-slate-500">Nome do Arquivo</dt>
                    <dd className="font-medium text-slate-900">{result.fileName}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-slate-500">Extensão</dt>
                    <dd className="font-medium text-slate-900">{result.extension}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-slate-500">Tamanho</dt>
                    <dd className="font-medium text-slate-900">{formatBytes(result.sizeInBytes)}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-slate-500">Tipo de Conteúdo</dt>
                    <dd className="font-medium text-slate-900">{result.contentType}</dd>
                  </div>
                  <div className="flex flex-col sm:col-span-2">
                    <dt className="text-slate-500">SHA-256</dt>
                    <dd className="font-mono font-medium text-slate-900 text-xs break-all">
                      {result.sha256}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}