import { useState } from 'react'
import { AlertCircle, Check, Clock, Copy, FileText, FolderOpen, Search, Trash2 } from 'lucide-react'
import { deleteFile, findDuplicateFiles, handleApiError, openFileLocation } from '@/services/api'
import type { DuplicateFileResponse } from '@/types'

export const DuplicateFiles = () => {
  const [searchPath, setSearchPath] = useState('')
  const [files, setFiles] = useState<DuplicateFileResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const duplicateGroups = files === null
    ? null
    : Array.from(
        files.reduce((groups, file) => {
          const key = file.name.toLocaleLowerCase()
          const group = groups.get(key)
          if (group) {
            group.files.push(file)
          } else {
            groups.set(key, { name: file.name, files: [file] })
          }
          return groups
        }, new Map<string, { name: string; files: DuplicateFileResponse[] }>()),
      ).sort((a, b) => a[1].name.localeCompare(b[1].name))

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

  const removeFile = async (file: DuplicateFileResponse) => {
    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir este arquivo?\n\n${file.fullPath}`,
    )
    if (!confirmed) return

    setDeletingPath(file.fullPath)
    setError(null)
    try {
      await deleteFile(file.fullPath)
      setFiles((currentFiles) => {
        if (currentFiles === null) return currentFiles

        const remainingFiles = currentFiles.filter((current) => current.fullPath !== file.fullPath)
        const remainingWithSameName = remainingFiles.filter(
          (current) => current.name.toLocaleLowerCase() === file.name.toLocaleLowerCase(),
        )

        return remainingWithSameName.length < 2
          ? remainingFiles.filter(
              (current) => current.name.toLocaleLowerCase() !== file.name.toLocaleLowerCase(),
            )
          : remainingFiles
      })
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.detail || 'Erro ao excluir arquivo')
    } finally {
      setDeletingPath(null)
    }
  }

  const showFileLocation = async (file: DuplicateFileResponse) => {
    setOpeningPath(file.fullPath)
    setError(null)
    try {
      await openFileLocation(file.fullPath)
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.detail || 'Erro ao abrir a localização do arquivo')
    } finally {
      setOpeningPath(null)
    }
  }

  const copyFilePath = async (file: DuplicateFileResponse) => {
    setError(null)
    try {
      await navigator.clipboard.writeText(file.fullPath)
      setCopiedPath(file.fullPath)
      window.setTimeout(() => {
        setCopiedPath((currentPath) => currentPath === file.fullPath ? null : currentPath)
      }, 2000)
    } catch {
      setError('Não foi possível copiar o caminho. Verifique a permissão da área de transferência do navegador.')
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
            disabled={loading || deletingPath !== null || openingPath !== null}
          />
        </div>
        <button
          type="submit"
          disabled={loading || deletingPath !== null || openingPath !== null}
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

      {files !== null && duplicateGroups !== null && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Resultados</h2>
            <span className="text-xs font-medium text-slate-500">
              {duplicateGroups.length} nomes · {files.length} caminhos
            </span>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum arquivo duplicado encontrado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {duplicateGroups.map(([key, group]) => (
                <li key={key} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">{group.name}</h3>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {group.files.length} caminhos
                    </span>
                  </div>
                  <ul className="mt-2 space-y-2 border-l-2 border-blue-100 pl-4">
                    {group.files.map((file) => (
                      <li key={file.fullPath} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-xs">
                          <p className="text-slate-600 break-all">{file.fullPath}</p>
                          <p className="mt-1 text-slate-400">
                            {formatBytes(file.sizeInBytes)} · Modificado em{' '}
                            {new Date(file.lastModifiedUtc).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => showFileLocation(file)}
                            disabled={openingPath !== null || deletingPath !== null}
                            aria-label={`Abrir localização de ${file.name}`}
                            title="Ir para o local do arquivo"
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {openingPath === file.fullPath ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <FolderOpen className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyFilePath(file)}
                            aria-label={`Copiar caminho de ${file.name}`}
                            title="Copiar caminho"
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                          >
                            {copiedPath === file.fullPath ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(file)}
                            disabled={deletingPath !== null || openingPath !== null}
                            aria-label={`Excluir ${file.name} em ${file.fullPath}`}
                            title="Excluir arquivo"
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {deletingPath === file.fullPath ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
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
