#!/usr/bin/env node
/**
 * Generates strong random secrets for production .env configuration.
 * Usage: node scripts/generateSecrets.js
 */
const crypto = require('crypto')

function generateSecret (bytes = 64) {
  return crypto.randomBytes(bytes).toString('base64url')
}

console.log('\n=== Production JWT Secrets ===')
console.log('Copy these into your production .env file:\n')
console.log(`SECRET_KEY=${generateSecret(64)}`)
console.log(`REFRESH_SECRET_KEY=${generateSecret(64)}`)
console.log(`SIGN_SECRET_KEY=${generateSecret(64)}`)
console.log('\n# CSRF double-submit cookie token is auto-generated per session.')
console.log('# WEBSITE_CONTACT_API_KEY for public contact form:')
console.log(`WEBSITE_CONTACT_API_KEY=${generateSecret(32)}`)
console.log('\n=== End ===\n')
console.log('IMPORTANT: Each environment (staging, production) must use DIFFERENT secrets.')
console.log('Never reuse secrets across environments or share them in source control.\n')
