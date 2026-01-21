import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

export async function listReceptionists(_req: Request, res: Response) {
  const receptionists = await prisma.receptionist.findMany({ orderBy: { name: 'asc' } })
  res.json(receptionists)
}

export async function getReceptionist(req: Request, res: Response) {
  const receptionist = await prisma.receptionist.findUnique({ where: { id: getIdParam(req) } })
  if (!receptionist) {
    res.status(404).json({ error: 'Receptionist not found' })
    return
  }
  res.json(receptionist)
}

export async function createReceptionist(req: Request, res: Response) {
  const email = req.body.email as string | undefined
  if (!email) {
    res.status(400).json({ error: 'email is required' })
    return
  }
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
  const hash = await bcrypt.hash(defaultPassword, 10)
  const receptionist = await prisma.$transaction(async (tx) => {
    const created = await tx.receptionist.create({
      data: {
        name: req.body.name,
        email,
        address: req.body.address,
        phone: req.body.phone,
        unitId: req.body.unitId,
      },
    })
    await tx.user.create({
      data: {
        email,
        password: hash,
        role: 'receptionist',
        unitId: created.unitId,
        mustChangePassword: true,
      },
    })
    return created
  })
  res.status(201).json(receptionist)
}

export async function updateReceptionist(req: Request, res: Response) {
  try {
    const receptionistId = getIdParam(req)
    const receptionist = await prisma.$transaction(async (tx) => {
      const existing = await tx.receptionist.findUnique({ where: { id: receptionistId } })
      if (!existing) {
        return null
      }
      const updated = await tx.receptionist.update({
        where: { id: receptionistId },
        data: {
          name: req.body.name,
          email: req.body.email ?? existing.email,
          address: req.body.address,
          phone: req.body.phone,
          unitId: req.body.unitId,
        },
      })
      if (req.body.email && req.body.email !== existing.email) {
        if (existing.email) {
          await tx.user.updateMany({
            where: { email: existing.email, role: 'receptionist' },
            data: { email: req.body.email, unitId: updated.unitId },
          })
        } else {
          const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
          const hash = await bcrypt.hash(defaultPassword, 10)
          await tx.user.create({
            data: {
              email: req.body.email,
              password: hash,
              role: 'receptionist',
              unitId: updated.unitId,
              mustChangePassword: true,
            },
          })
        }
      } else if (req.body.unitId && existing.email) {
        await tx.user.updateMany({
          where: { email: existing.email, role: 'receptionist' },
          data: { unitId: updated.unitId },
        })
      }
      return updated
    })
    if (!receptionist) {
      res.status(404).json({ error: 'Receptionist not found' })
      return
    }
    res.json(receptionist)
  } catch {
    res.status(404).json({ error: 'Receptionist not found' })
  }
}

export async function deleteReceptionist(req: Request, res: Response) {
  try {
    const receptionist = await prisma.receptionist.findUnique({ where: { id: getIdParam(req) } })
    if (!receptionist) {
      res.status(404).json({ error: 'Receptionist not found' })
      return
    }
    await prisma.$transaction(async (tx) => {
      if (receptionist.email) {
        await tx.user.deleteMany({ where: { email: receptionist.email, role: 'receptionist' } })
      }
      await tx.receptionist.delete({ where: { id: receptionist.id } })
    })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Receptionist not found' })
  }
}
