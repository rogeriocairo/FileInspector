import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowDownWideNarrow, ArrowUpWideNarrow, Check, Clock, Copy, Eye, FileText, FolderOpen, Search, Trash2, X } from 'lucide-react'
import { deleteFile, findDuplicateFiles, getFilePreview, getFilePreviewBlob, handleApiError, openFileLocation } from '@/services/api'
import type { DuplicateFileResponse } from '@/types'

type PreviewKind = 'text' | 'image' | 'pdf' | 'unsupported'

const textFileExtensions = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.log', '.yaml', '.yml', '.ini',
])
const imageFileExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
])

const getPreviewKind = (fileName: string): PreviewKind => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLocaleLowerCase()
  if (textFileExtensions.has(extension)) return 'text'
  if (imageFileExtensions.has(extension)) return 'image'
  if (extension === '.pdf') return 'pdf'
  return 'unsupported'
}

export const DuplicateFiles = () => {
  const [searchPath, setSearchPath] = useState('')
  const [files, setFiles] = useState<DuplicateFileResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'size'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [previewFile, setPreviewFile] = useState<DuplicateFileResponse | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewController = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

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

  const sortedDuplicateGroups = duplicateGroups === null
    ? null
    : duplicateGroups.map(([key, group]) => ({
        key,
        ...group,
        maxSize: Math.max(...group.files.map((file) => file.sizeInBytes)),
        hasDifferentSizes: new Set(group.files.map((file) => file.sizeInBytes)).size > 1,
        hasDifferentModifiedDates: new Set(group.files.map((file) => file.lastModifiedUtc)).size > 1,
        files: [...group.files].sort((a, b) => {
          const comparison = sortBy === 'size'
            ? a.sizeInBytes - b.sizeInBytes
            : a.fullPath.localeCompare(b.fullPath)
          return sortDirection === 'asc' ? comparison : -comparison
        }),
      })).sort((a, b) => {
        const comparison = sortBy === 'size'
          ? a.maxSize - b.maxSize
          : a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
        return sortDirection === 'asc' ? comparison : -comparison
      })

  const changeSort = (field: 'name' | 'size') => {
    if (sortBy === field) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

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
      `Tem certeza de que deseja mover este arquivo para a Lixeira?\n\n${file.fullPath}`,
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
      setError(apiError.detail || 'Erro ao mover arquivo para a Lixeira')
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

  const showFilePreview = async (file: DuplicateFileResponse) => {
    previewController.current?.abort()
    previewController.current = null
    setPreviewFile(file)
    setPreviewContent(null)
    setPreviewUrl(null)
    setPreviewError(null)
    setPreviewLoading(false)
    const previewKind = getPreviewKind(file.name)
    if (previewKind === 'unsupported') return

    const controller = new AbortController()
    previewController.current = controller
    setPreviewLoading(true)
    try {
      if (previewKind === 'text') {
        setPreviewContent(await getFilePreview(file.fullPath, controller.signal))
      } else {
        const previewBlob = await getFilePreviewBlob(file.fullPath, controller.signal)
        if (!controller.signal.aborted) {
          setPreviewUrl(URL.createObjectURL(previewBlob))
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const apiError = handleApiError(err)
      setPreviewError(apiError.detail || 'Não foi possível visualizar este arquivo.')
    } finally {
      if (previewController.current === controller) {
        previewController.current = null
        setPreviewLoading(false)
      }
    }
  }

  const closeFilePreview = () => {
    previewController.current?.abort()
    previewController.current = null
    setPreviewFile(null)
    setPreviewContent(null)
    setPreviewUrl(null)
    setPreviewError(null)
    setPreviewLoading(false)
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

      {files !== null && sortedDuplicateGroups !== null && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 p-4 bg-slate-50 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">Resultados</h2>
              <span className="text-xs font-medium text-slate-500">
                {sortedDuplicateGroups.length} nomes · {files.length} caminhos
              </span>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Ordenar resultados">
              <span className="text-xs text-slate-500">Ordenar por:</span>
              {(['name', 'size'] as const).map((field) => {
                const isSelected = sortBy === field
                const directionLabel = field === 'name'
                  ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A')
                  : (sortDirection === 'asc' ? 'menor para maior' : 'maior para menor')
                const label = field === 'name' ? 'Nome' : 'Tamanho'
                const SortIcon = sortDirection === 'asc' ? ArrowUpWideNarrow : ArrowDownWideNarrow

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => changeSort(field)}
                    aria-label={`Ordenar por ${label.toLocaleLowerCase()}${isSelected ? `: ${directionLabel}` : ''}`}
                    aria-pressed={isSelected}
                    title={field === 'size' ? 'Ordena grupos pelo maior arquivo e caminhos por tamanho' : undefined}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                    {isSelected && <SortIcon className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          </div>

          {sortedDuplicateGroups.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum arquivo duplicado encontrado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {sortedDuplicateGroups.map((group) => (
                <li key={group.key} className="px-4 py-4">
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
                            <span
                              className={group.hasDifferentSizes
                                ? 'inline-block rounded bg-amber-100 px-1.5 py-0.5 text-amber-900'
                                : undefined}
                              title={group.hasDifferentSizes ? 'Arquivos com o mesmo nome possuem tamanhos diferentes' : undefined}
                            >
                              {formatBytes(file.sizeInBytes)}
                            </span>
                            {' · Modificado em '}
                            <span
                              className={group.hasDifferentModifiedDates
                                ? 'inline-block rounded bg-amber-100 px-1.5 py-0.5 text-amber-900'
                                : undefined}
                              title={group.hasDifferentModifiedDates
                                ? 'Arquivos com o mesmo nome possuem datas ou horários diferentes'
                                : undefined}
                            >
                              {new Date(file.lastModifiedUtc).toLocaleString('pt-BR')}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => showFilePreview(file)}
                            disabled={deletingPath !== null || openingPath !== null}
                            aria-label={`Visualizar ${file.name}`}
                            title="Visualizar arquivo"
                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
                            aria-label={`Mover ${file.name} para a Lixeira`}
                            title="Mover para a Lixeira"
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

      {previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-preview-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
              <div className="min-w-0">
                <h2 id="file-preview-title" className="text-base font-semibold text-slate-900">
                  Visualizar arquivo
                </h2>
                <p className="mt-1 break-all text-xs text-slate-500">{previewFile.fullPath}</p>
              </div>
              <button
                type="button"
                onClick={closeFilePreview}
                aria-label="Fechar visualização"
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-48 overflow-auto p-4">
              {previewError ? (
                <p role="alert" className="text-sm text-red-700">{previewError}</p>
              ) : getPreviewKind(previewFile.name) === 'unsupported' ? (
                <p className="text-sm text-slate-600">
                  A visualização está disponível apenas para arquivos de texto, imagens e PDFs compatíveis.
                </p>
              ) : getPreviewKind(previewFile.name) === 'image' ? (
                previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                    <Clock className="h-4 w-4 animate-spin" />
                    Carregando imagem...
                  </div>
                ) : (
                  <img
                    src={previewUrl ?? undefined}
                    alt={previewFile.name}
                    onError={() => setPreviewError('Não foi possível carregar a imagem.')}
                    className="mx-auto max-h-[70vh] max-w-full object-contain"
                  />
                )
              ) : getPreviewKind(previewFile.name) === 'pdf' ? (
                previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                    <Clock className="h-4 w-4 animate-spin" />
                    Carregando PDF...
                  </div>
                ) : (
                  <iframe
                    src={previewUrl ?? undefined}
                    title={`Prévia de ${previewFile.name}`}
                    className="h-[70vh] w-full rounded border border-slate-200"
                  />
                )
              ) : previewLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Clock className="h-4 w-4 animate-spin" />
                  Carregando arquivo...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-800">
                  {previewContent}
                </pre>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
