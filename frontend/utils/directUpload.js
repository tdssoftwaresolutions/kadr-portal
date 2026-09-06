import axios from 'axios'
import { apiClient } from './apiClient'
import { SIGNUP_UPLOAD_URL_ENDPOINT } from '../store/endpoints'

/**
 * Direct-to-S3 upload helper for the signup flow.
 *
 * Instead of base64-encoding files into the JSON signup request, the browser:
 *   1. asks the backend for a short-lived presigned S3 PUT URL, then
 *   2. uploads the raw file bytes straight to S3.
 *
 * Only the returned object URL is later submitted with the signup form, so
 * large files never travel through the app server.
 */

/**
 * Request a presigned upload URL for a given signup file purpose.
 * @param {string} purpose - One of 'mcpc-certificate' | 'llb-certificate' | 'profile-picture'.
 * @param {string} contentType - The file's MIME type.
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string, contentType: string}>}
 */
async function requestSignupUploadUrl (purpose, contentType) {
  const { data } = await apiClient.post(
    SIGNUP_UPLOAD_URL_ENDPOINT,
    { purpose, contentType }
  )
  if (!data || data.success === false) {
    throw new Error(data?.error?.message || 'Could not prepare file upload.')
  }
  return data.data
}

/**
 * Upload a File directly to S3 using a presigned PUT URL and return the
 * resulting public object URL to store on the user record.
 *
 * @param {string} purpose - Signup file purpose (see requestSignupUploadUrl).
 * @param {File} file - The browser File object to upload.
 * @returns {Promise<string>} The S3 object URL.
 */
export async function uploadSignupFile (purpose, file) {
  if (!file) return ''

  const contentType = file.type || 'application/octet-stream'
  const { uploadUrl, publicUrl } = await requestSignupUploadUrl(purpose, contentType)

  // Use a bare axios call (not apiClient) so none of the app's baseURL,
  // Authorization, or CSRF headers are attached — S3 signed the request for
  // exactly the Content-Type below and rejects anything extra.
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': contentType },
    // A user's certificate/photo can be several MB on a slow connection.
    timeout: 120000
  })

  return publicUrl
}
