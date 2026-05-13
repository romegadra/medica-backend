import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  const receptionists = await prisma.receptionist.findMany({
    where: {
      email: {
        not: null,
      },
    },
  })

  let updatedCount = 0
  for (const receptionist of receptionists) {
    if (!receptionist.email) continue
    const result = await prisma.user.updateMany({
      where: {
        email: receptionist.email,
        role: 'receptionist',
      },
      data: {
        receptionistId: receptionist.id,
        unitId: receptionist.unitId,
      },
    })
    updatedCount += result.count
  }

  console.log(`Linked ${updatedCount} receptionist user(s).`)
} catch (error) {
  console.error('Failed to link receptionist users:', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
