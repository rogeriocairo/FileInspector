export interface DuplicateFileResponse {
  name: string
  sizeInBytes: number
  lastModifiedUtc: string
  fullPath: string
  source?: 'googleDrive'
  driveFileId?: string
  driveMimeType?: string
  webViewLink?: string
}

export interface ApiError {
  detail?: string
  title?: string
  status?: number
}