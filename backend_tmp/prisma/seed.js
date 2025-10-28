// prisma/seed.js
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('admin123', 10)
  const existing = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
  if (!existing) {
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password,
        role: 'admin'
      }
    })
    console.log('Seeded admin: admin@example.com / admin123')
  } else {
    console.log('Admin user already exists')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
