const prisma = require('../../lib/prisma')

const DEFAULT_LOCK_MS = 10 * 60 * 1000

async function acquireSchedulerLock (jobName, lockMs = DEFAULT_LOCK_MS) {
  const now = new Date()
  const lockedUntil = new Date(now.getTime() + lockMs)
  const lockedBy = `worker-${process.pid}`

  const released = await prisma.scheduler_locks.updateMany({
    where: { job_name: jobName, locked_until: { lte: now } },
    data: { locked_until: lockedUntil, locked_by: lockedBy }
  })
  if (released.count > 0) return true

  try {
    await prisma.scheduler_locks.create({
      data: { job_name: jobName, locked_until: lockedUntil, locked_by: lockedBy }
    })
    return true
  } catch (err) {
    if (err.code === 'P2002') return false
    throw err
  }
}

async function releaseSchedulerLock (jobName) {
  await prisma.scheduler_locks.deleteMany({ where: { job_name: jobName } }).catch(() => {})
}

async function withSchedulerLock (jobName, fn, lockMs = DEFAULT_LOCK_MS) {
  const acquired = await acquireSchedulerLock(jobName, lockMs)
  if (!acquired) {
    console.log(`[scheduler] Skipping ${jobName} — another instance holds the lock`)
    return null
  }
  try {
    return await fn()
  } finally {
    await releaseSchedulerLock(jobName)
  }
}

module.exports = { acquireSchedulerLock, releaseSchedulerLock, withSchedulerLock }
