/**
 * Single Prisma client for the whole process.
 * Prevents max_connections_per_hour exhaustion from many `new PrismaClient()` copies
 * (especially under nodemon hot-reload).
 */
const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis

// Query duration was previously invisible in production (log: ['error'] only)
// — with no way to tell which queries are actually slow after the AWS
// deploy. Query events are always captured now; anything over
// SLOW_QUERY_THRESHOLD_MS (default 200ms) is logged regardless of
// PRISMA_LOG. Setting PRISMA_LOG=1 still logs every query (not just slow
// ones), matching the old verbose-mode behavior.
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 200

function createClient () {
  const verbose = process.env.PRISMA_LOG === '1'
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      ...(verbose ? [{ emit: 'stdout', level: 'warn' }] : []),
      { emit: 'stdout', level: 'error' }
    ]
  })

  client.$on('query', (e) => {
    if (verbose) {
      console.log(`[prisma] ${e.duration}ms: ${e.query}`)
    } else if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[slow-query] ${e.duration}ms: ${e.query}`)
    }
  })

  return client
}

let prisma = globalForPrisma.__kadrPrisma ?? createClient()

if (!globalForPrisma.__kadrPrismaNotificationMiddleware) {
  const { applyNotificationMiddleware } = require('../services/notification/prismaNotificationMiddleware')
  applyNotificationMiddleware(prisma)
  globalForPrisma.__kadrPrismaNotificationMiddleware = true
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__kadrPrisma = prisma
}

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

module.exports = prisma
