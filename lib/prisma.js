/**
 * Single Prisma client for the whole process.
 * Prevents max_connections_per_hour exhaustion from many `new PrismaClient()` copies
 * (especially under nodemon hot-reload).
 */
const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis

function createClient () {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['query', 'warn', 'error'] : ['error']
  })
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
