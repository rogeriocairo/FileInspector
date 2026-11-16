import type { DuplicateFileResponse } from '@/types'

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const GOOGLE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
}

interface GoogleDriveFileList {
  files?: GoogleDriveFile[]
  nextPageToken?: string
}

interface GoogleDriveFolder {
  id: string
  path: string
}

let identityScriptPromise: Promise<void> | null = null

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts.oauth2) return
  if (!identityScriptPromise) {
    identityScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GOOGLE_IDENTITY_SCRIPT
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        identityScriptPromise = null
        reject(new Error('Não foi possível carregar a autenticação do Google.'))
      }
      document.head.appendChild(script)
    })
  }
  await identityScriptPromise
}

export const requestGoogleDriveAccessToken = async (clientId: string): Promise<string> => {
  await loadGoogleIdentityScript()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) {
    throw new Error('O serviço de autenticação do Google não ficou disponível.')
  }

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'A autorização do Google foi recusada.'))
          return
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'Não foi possível concluir a autenticação do Google.'))
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

const getDrivePage = async (
  accessToken: string,
  folderId: string,
  pageToken?: string,
): Promise<GoogleDriveFileList> => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: '1000',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)',
    spaces: 'drive',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    let detail = `A API do Google Drive retornou o erro ${response.status}.`
    try {
      const body = await response.json() as { error?: { message?: string } }
      detail = body.error?.message || detail
    } catch {
      // Keep the HTTP status message when Google does not return a JSON error.
    }
    throw new Error(detail)
  }
  return await response.json() as GoogleDriveFileList
}

export const findGoogleDriveDuplicateFiles = async (
  accessToken: string,
): Promise<DuplicateFileResponse[]> => {
  const folders: GoogleDriveFolder[] = [{ id: 'root', path: '' }]
  const visitedFolders = new Set<string>()
  const files: DuplicateFileResponse[] = []

  for (let folderIndex = 0; folderIndex < folders.length; folderIndex += 1) {
    const folder = folders[folderIndex]
    if (!folder) continue
    if (visitedFolders.has(folder.id)) continue
    visitedFolders.add(folder.id)

    let pageToken: string | undefined
    do {
      const page = await getDrivePage(accessToken, folder.id, pageToken)
      for (const driveFile of page.files ?? []) {
        if (driveFile.mimeType === GOOGLE_FOLDER_MIME_TYPE) {
          folders.push({
            id: driveFile.id,
            path: folder.path ? `${folder.path}/${driveFile.name}` : driveFile.name,
          })
          continue
        }

        files.push({
          name: driveFile.name,
          sizeInBytes: Number(driveFile.size ?? 0),
          lastModifiedUtc: driveFile.modifiedTime ?? new Date(0).toISOString(),
          fullPath: `Meu Drive/${folder.path ? `${folder.path}/` : ''}${driveFile.name}`,
          source: 'googleDrive',
          driveFileId: driveFile.id,
          driveMimeType: driveFile.mimeType,
          webViewLink: driveFile.webViewLink,
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken)
  }

  const duplicateNames = new Set<string>()
  const counts = new Map<string, number>()
  for (const file of files) {
    const key = file.name.toLocaleLowerCase()
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    if (count > 1) duplicateNames.add(key)
  }

  return files
    .filter((file) => duplicateNames.has(file.name.toLocaleLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
      a.fullPath.localeCompare(b.fullPath, undefined, { sensitivity: 'base' }))
}

export const moveGoogleDriveFileToTrash = async (
  accessToken: string,
  fileId: string,
): Promise<void> => {
  const response = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  })
  if (!response.ok) {
    let detail = `Não foi possível mover o arquivo para a Lixeira do Google Drive (${response.status}).`
    try {
      const body = await response.json() as { error?: { message?: string } }
      detail = body.error?.message || detail
    } catch {
      // Keep the HTTP status message when Google does not return a JSON error.
    }
    throw new Error(detail)
  }
}

export const getGoogleDriveFilePreview = async (
  accessToken: string,
  fileId: string,
  signal?: AbortSignal,
): Promise<Blob> => {
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal },
  )
  if (!response.ok) {
    let detail = `Não foi possível carregar a prévia do Google Drive (${response.status}).`
    try {
      const body = await response.json() as { error?: { message?: string } }
      detail = body.error?.message || detail
    } catch {
      // Keep the HTTP status message when Google does not return a JSON error.
    }
    throw new Error(detail)
  }
  return await response.blob()
}
