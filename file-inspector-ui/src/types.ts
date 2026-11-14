export interface FileInspectionResponse {
  fileName: string
  extension: string
  sizeInBytes: number
  contentType: string
  sha256: string
}

export interface DuplicateFileResponse {
  name: string
  sizeInBytes: number
  lastModifiedUtc: string
  fullPath: string
}

export interface FolderFileResponse {
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