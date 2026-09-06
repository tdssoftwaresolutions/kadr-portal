const { getPresignedUploadUrl } = require('../utils/uploadService')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { success } = require('../utils/responses')

// Purposes the client may request a presigned upload URL for. Keeping this as
// an allow-list prevents callers from writing arbitrary key prefixes into the
// bucket and makes stored objects self-describing.
const UPLOAD_PURPOSES = {
  'mcpc-certificate': 'mcpc-certificate',
  'llb-certificate': 'llb-certificate',
  'profile-picture': 'profile-picture',
  evidence: 'evidence'
}

module.exports = {
  /**
   * Issue a short-lived presigned S3 PUT URL so the browser can upload a file
   * directly to S3. Only the resulting object key/URL is later submitted with
   * the signup request, so large files never pass through this server as
   * base64 JSON.
   *
   * Body: { purpose: string, contentType: string }
   * Returns: { uploadUrl, key, publicUrl, contentType, expiresIn }
   */
  createSignupUploadUrl: async function (req, res, next) {
    try {
      const { purpose, contentType } = req.body || {}

      const prefix = UPLOAD_PURPOSES[purpose]
      if (!prefix) {
        throw createError(errorCodes.INVALID_REQUEST, { message: 'Invalid upload purpose.' })
      }
      if (!contentType || typeof contentType !== 'string') {
        throw createError(errorCodes.INVALID_REQUEST, { message: 'contentType is required.' })
      }

      const result = await getPresignedUploadUrl({
        contentType,
        fileNamePrefix: prefix,
        expiresIn: 300
      })

      success(res, result)
    } catch (error) {
      if (error.errorCode) {
        next(error)
        return
      }
      next(createError(errorCodes.INVALID_REQUEST))
    }
  }
}
