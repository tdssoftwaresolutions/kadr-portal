import { isNativeApp } from './platform'
import { apiClient } from './apiClient'

/**
 * Download a PDF (or blob) from an authenticated API path and save on device or browser.
 */
export async function downloadAuthenticatedBlob ({
  url,
  filename,
  responseType = 'blob'
}) {
  const response = await apiClient.get(url, { responseType })
  const blob = response.data
  const contentType =
    (response.headers && response.headers['content-type']) ||
    'application/octet-stream'

  if (isNativeApp()) {
    await saveBlobNative(blob, filename, contentType)
    return { saved: true, native: true, filename }
  }

  const objectUrl = window.URL.createObjectURL(new Blob([blob], { type: contentType }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
  return { saved: true, native: false, filename }
}

async function saveBlobNative (blob, filename, contentType) {
  const { Filesystem, Directory } = await import(
    /* webpackChunkName: "capacitor-fs" */ '@capacitor/filesystem'
  )

  const base64 = await blobToBase64(blob)
  const subdir = 'KadrPortal'
  const path = `${subdir}/${sanitizeFilename(filename)}`

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Documents,
    recursive: true
  })

  return path
}

function sanitizeFilename (name) {
  return String(name || 'download')
    .replace(/[^\w.]+/g, '_')
    .slice(0, 120)
}

function blobToBase64 (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result || ''
      const base64 = String(result).split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
