import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const [, , email, password] = process.argv

if (!email || !password) {
  console.error('Usage: node create-admin.mjs <email> <password>')
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      role: 'admin',
    },
  })
  console.log('Created admin:', { id: user.id, email: user.email })
} catch (error) {
  console.error('Failed to create admin:', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
