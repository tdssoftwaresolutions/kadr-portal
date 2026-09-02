#!/usr/bin/env node
/**
 * Create the first master admin user (required before any admin can log in).
 *
 * Usage:
 *   node scripts/createMasterAdmin.js admin@example.com 'YourPassword123' 'Admin Name'
 *
 * Or set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env and run:
 *   node scripts/createMasterAdmin.js
 */
require('dotenv').config()

const prisma = require('../lib/prisma')
const helper = require('../utils/helper')

async function main () {
  const email = process.argv[2] || process.env.ADMIN_EMAIL
  const password = process.argv[3] || process.env.ADMIN_PASSWORD
  const name = process.argv[4] || process.env.ADMIN_NAME || 'Master Admin'

  if (!email || !password) {
    console.error('Usage: node scripts/createMasterAdmin.js <email> <password> [name]')
    console.error('   Or set ADMIN_EMAIL and ADMIN_PASSWORD in .env')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({
    where: {
      email_user_type: {
        email,
        user_type: 'ADMIN'
      }
    }
  })
  if (existing) {
    console.error(`Admin already exists: ${email}`)
    process.exit(1)
  }

  const passwordHash = await helper.hashPassword(password)
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      user_type: 'ADMIN',
      active: true,
      master: true,
      is_self_signed_up: false
    },
    select: { id: true, name: true, email: true, master: true }
  })

  console.log('Master admin created successfully.')
  console.log(`  Email: ${admin.email}`)
  console.log(`  Name:  ${admin.name}`)
  console.log(`  ID:    ${admin.id}`)
  console.log(`Sign in at ${process.env.PORTAL_APP_URL || process.env.BASE_URL || 'http://localhost:3000'}/auth/sign-in`)
}

main()
  .catch((err) => {
    console.error('Failed to create master admin:', err.message || err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
