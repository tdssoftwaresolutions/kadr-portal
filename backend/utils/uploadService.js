const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const { createError } = require('./errors')
const errorCodes = require('./errors/errorCodes')

const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
}

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024

function parseBase64Upload (base64Content) {
  const matches = base64Content.match(/^data:(.+);base64,(.+)$/)
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1].split(';')[0].toLowerCase(),
      fileBuffer: Buffer.from(matches[2], 'base64')
    }
  }
  return {
    mimeType: 'application/pdf',
    fileBuffer: Buffer.from(base64Content, 'base64')
  }
}

function validateUpload ({ base64Content, maxBytes = DEFAULT_MAX_BYTES, allowedMimeTypes = ALLOWED_MIME_TYPES }) {
  if (!base64Content || typeof base64Content !== 'string') {
    throw createError(errorCodes.INVALID_REQUEST, { message: 'File content is required.' })
  }
  const { mimeType, fileBuffer } = parseBase64Upload(base64Content)
  if (!allowedMimeTypes[mimeType]) {
    throw createError(errorCodes.INVALID_REQUEST, { message: `File type not allowed: ${mimeType}` })
  }
  if (fileBuffer.length > maxBytes) {
    throw createError(errorCodes.INVALID_REQUEST, { message: `File exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))}MB.` })
  }
  return { mimeType, fileBuffer, extension: allowedMimeTypes[mimeType] }
}

async function uploadToS3 (base64Content, fileNamePrefix, options = {}) {
  const { mimeType, fileBuffer, extension } = validateUpload({ base64Content, ...options })
  const region = process.env.S3_REGION || 'ap-south-1'
  const bucket = process.env.S3_BUCKET_NAME

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    useGlobalEndpoint: false
  })

  const safePrefix = String(fileNamePrefix || 'upload').replace(/[^a-zA-Z0-9-_]/g, '-')
  const fullFileName = `${safePrefix}-${uuidv4()}.${extension}`

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: fullFileName,
    Body: fileBuffer,
    ContentType: mimeType
  }))

  return `https://${bucket}.s3.${region}.amazonaws.com/${fullFileName}`
}

/**
 * Generate a presigned URL for reading a private S3 object.
 * Use this instead of exposing raw S3 URLs when the bucket is private.
 * @param {string} key - S3 object key (or full URL from which key is extracted)
 * @param {number} expiresIn - URL validity in seconds (default: 1 hour)
 */
async function getPresignedUrl (key, expiresIn = 3600) {
  const region = process.env.S3_REGION || 'ap-south-1'
  const bucket = process.env.S3_BUCKET_NAME

  if (!bucket || !process.env.S3_ACCESS_KEY_ID) {
    // If S3 not configured, return the key as-is (development fallback)
    return key
  }

  // Extract key from full URL if needed
  let objectKey = key
  const bucketUrlPrefix = `https://${bucket}.s3.${region}.amazonaws.com/`
  if (key && key.startsWith(bucketUrlPrefix)) {
    objectKey = key.replace(bucketUrlPrefix, '')
  }
  // Also handle path-style URLs
  const pathPrefix = `https://s3.${region}.amazonaws.com/${bucket}/`
  if (key && key.startsWith(pathPrefix)) {
    objectKey = key.replace(pathPrefix, '')
  }

  if (!objectKey) return key

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  })

  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
  return getSignedUrl(s3, command, { expiresIn })
}

module.exports = {
  ALLOWED_MIME_TYPES,
  DEFAULT_MAX_BYTES,
  validateUpload,
  uploadToS3,
  parseBase64Upload,
  getPresignedUrl
}
