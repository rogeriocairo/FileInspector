export interface DuplicateFileResponse {
  name: string
  sizeInBytes: number
  lastModifiedUtc: string
  fullPath: string
}

export interface ApiError {
  detail?: string
  title?: string
  status?: number
}