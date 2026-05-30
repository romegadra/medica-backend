import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import { prisma } from '../prisma.js'

type AuditInput = {
  action: string
  entityType: string
  entityId?: string | null
  summary?: string
  unitId?: string | null
  doctorId?: string | null
  before?: Prisma.InputJsonValue | null
  after?: Prisma.InputJsonValue | null
}

export function writeAuditLog(req: Request, input: AuditInput) {
  const auth = req.auth
  void prisma.auditLog
    .create({
      data: {
        userId: auth?.userId ?? null,
        role: auth?.role ?? null,
        unitId: input.unitId ?? auth?.unitId ?? null,
        doctorId: input.doctorId ?? auth?.doctorId ?? null,
        receptionistId: auth?.receptionistId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    })
    .catch((error) => {
      // Auditing must not break the clinical workflow.
      console.error('[audit:error]', error)
    })
}
