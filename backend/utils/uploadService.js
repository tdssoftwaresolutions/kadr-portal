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

function getBucketConfig () {
  return {
    region: process.env.S3_REGION || 'ap-south-1',
    bucket: process.env.S3_BUCKET_NAME
  }
}

function createS3Client () {
  const { region } = getBucketConfig()
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    useGlobalEndpoint: false
  })
}

function buildObjectUrl (key) {
  const { region, bucket } = getBucketConfig()
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Accept an object URL from the client only if it points at our own S3 bucket.
 * The browser uploads files directly to S3 via presigned URLs and then submits
 * the resulting URL — this guard prevents a caller from persisting an arbitrary
 * external link on a record. Returns the URL when valid, otherwise null.
 */
function sanitizeBucketUrl (candidate) {
  if (!candidate || typeof candidate !== 'string') return null
  const { bucket } = getBucketConfig()
  if (!bucket) return null
  return candidate.startsWith(buildObjectUrl('')) ? candidate : null
}

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
  const { bucket } = getBucketConfig()
  const s3 = createS3Client()

  const safePrefix = String(fileNamePrefix || 'upload').replace(/[^a-zA-Z0-9-_]/g, '-')
  const fullFileName = `${safePrefix}-${uuidv4()}.${extension}`

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: fullFileName,
    Body: fileBuffer,
    ContentType: mimeType
  }))

  return buildObjectUrl(fullFileName)
}

/**
 * Generate a presigned PUT URL so a browser can upload a file directly to S3
 * without routing the bytes through this server.
 *
 * The content type is validated against the allow-list up front, and the
 * generated URL is bound to that exact content type — the client MUST send the
 * same `Content-Type` header on the PUT or S3 rejects the request. This keeps
 * the upload constrained to the file type we approved.
 *
 * @param {object} params
 * @param {string} params.contentType - MIME type the client intends to upload.
 * @param {string} [params.fileNamePrefix] - Human-readable key prefix.
 * @param {number} [params.expiresIn] - URL validity in seconds (default 300).
 * @returns {Promise<{uploadUrl: string, key: string, publicUrl: string, contentType: string, expiresIn: number}>}
 */
async function getPresignedUploadUrl ({ contentType, fileNamePrefix = 'upload', expiresIn = 300 } = {}) {
  const normalizedType = String(contentType || '').toLowerCase()
  const extension = ALLOWED_MIME_TYPES[normalizedType]
  if (!extension) {
    throw createError(errorCodes.INVALID_REQUEST, { message: `File type not allowed: ${contentType}` })
  }

  const { bucket } = getBucketConfig()
  if (!bucket || !process.env.S3_ACCESS_KEY_ID) {
    throw createError(errorCodes.INVALID_REQUEST, { message: 'File storage is not configured.' })
  }

  const safePrefix = String(fileNamePrefix || 'upload').replace(/[^a-zA-Z0-9-_]/g, '-')
  const key = `${safePrefix}-${uuidv4()}.${extension}`

  const s3 = createS3Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: normalizedType
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn })

  return {
    uploadUrl,
    key,
    publicUrl: buildObjectUrl(key),
    contentType: normalizedType,
    expiresIn
  }
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
  getPresignedUrl,
  getPresignedUploadUrl,
  sanitizeBucketUrl
}
