import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

export async function listAuditLogs(req: Request, res: Response) {
  const where: Prisma.AuditLogWhereInput = {}
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined
  const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined

  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (req.auth?.role !== 'superadmin' && req.auth?.unitId) {
    where.unitId = req.auth.unitId
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(logs)
}
