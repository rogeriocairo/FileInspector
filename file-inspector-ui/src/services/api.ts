import axios, { AxiosError } from 'axios'
import type { FileInspectionResponse, DuplicateFileResponse, FolderFileResponse, ApiError } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const inspectFile = async (file: File): Promise<FileInspectionResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<FileInspectionResponse>('/api/files/inspect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const findDuplicateFiles = async (path?: string): Promise<DuplicateFileResponse[]> => {
  const params = path ? { path } : {}
  const response = await api.get<DuplicateFileResponse[]>('/api/files/duplicates', { params })
  return response.data
}

export const getFolderFiles = async (path?: string): Promise<FolderFileResponse[]> => {
  const params = path ? { path } : {}
  const response = await api.get<FolderFileResponse[]>('/api/files/duplicates', { params })
  return response.data
}

export const deleteFile = async (fullPath: string): Promise<void> => {
  await api.delete('/api/files/delete', { data: { fullPath } })
}

export class ApiClientError extends Error {
  constructor(public error: ApiError) {
    super(error.detail || error.title || 'Erro na API')
    this.name = 'ApiClientError'
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    return {
      detail: axiosError.response?.data?.detail,
      title: axiosError.response?.data?.title,
      status: axiosError.response?.status,
    }
  }
  return { detail: 'Erro inesperado', title: 'Erro', status: 500 }
}