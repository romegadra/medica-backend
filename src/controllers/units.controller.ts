import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

function isMasterAdmin(req: Request) {
  return req.auth?.role === 'superadmin' || (req.auth?.role === 'admin' && !req.auth.unitId)
}

export async function listUnits(req: Request, res: Response) {
  const where: Prisma.UnitWhereInput = req.auth?.unitId ? { id: req.auth.unitId } : {}
  const units = await prisma.unit.findMany({ where, orderBy: { name: 'asc' } })
  res.json(units)
}

export async function getUnit(req: Request, res: Response) {
  const unit = await prisma.unit.findUnique({ where: { id: getIdParam(req) } })
  if (!unit) {
    res.status(404).json({ error: 'Unit not found' })
    return
  }
  res.json(unit)
}

export async function createUnit(req: Request, res: Response) {
  if (!isMasterAdmin(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const unit = await prisma.unit.create({
    data: {
      name: req.body.name,
      type: req.body.type,
      address: req.body.address,
      phone: req.body.phone,
      adminName: req.body.adminName,
      logoUrl: req.body.logoUrl,
    },
  })
  res.status(201).json(unit)
}

export async function updateUnit(req: Request, res: Response) {
  try {
    if (!isMasterAdmin(req) && req.auth?.unitId !== getIdParam(req)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const unit = await prisma.unit.update({
      where: { id: getIdParam(req) },
      data: {
        name: req.body.name,
        type: req.body.type,
        address: req.body.address,
        phone: req.body.phone,
        adminName: req.body.adminName,
        logoUrl: req.body.logoUrl,
      },
    })
    res.json(unit)
  } catch {
    res.status(404).json({ error: 'Unit not found' })
  }
}

export async function deleteUnit(req: Request, res: Response) {
  if (!isMasterAdmin(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const unit = await prisma.unit.findUnique({ where: { id: getIdParam(req) } })
  if (!unit) {
    res.status(404).json({ error: 'Unit not found' })
    return
  }

  await prisma.$transaction(async (tx) => {
    const doctors = await tx.doctor.findMany({ where: { unitId: unit.id }, select: { id: true } })
    const doctorIds = doctors.map((doctor) => doctor.id)
    if (doctorIds.length) {
      await tx.visitEntry.deleteMany({ where: { doctorId: { in: doctorIds } } })
      await tx.appointment.deleteMany({ where: { doctorId: { in: doctorIds } } })
      await tx.patient.deleteMany({ where: { doctorId: { in: doctorIds } } })
      await tx.doctorSchedule.deleteMany({ where: { doctorId: { in: doctorIds } } })
      await tx.doctorBlockedTime.deleteMany({ where: { doctorId: { in: doctorIds } } })
      await tx.doctor.deleteMany({ where: { id: { in: doctorIds } } })
    }
    await tx.receptionist.deleteMany({ where: { unitId: unit.id } })
    await tx.unit.delete({ where: { id: unit.id } })
  })

  res.status(204).send()
}
