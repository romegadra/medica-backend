import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listUnits(_req: Request, res: Response) {
  const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } })
  res.json(units)
}

export async function getUnit(req: Request, res: Response) {
  const unit = await prisma.unit.findUnique({ where: { id: req.params.id } })
  if (!unit) {
    res.status(404).json({ error: 'Unit not found' })
    return
  }
  res.json(unit)
}

export async function createUnit(req: Request, res: Response) {
  const unit = await prisma.unit.create({
    data: {
      name: req.body.name,
      type: req.body.type,
      address: req.body.address,
      phone: req.body.phone,
      adminName: req.body.adminName,
    },
  })
  res.status(201).json(unit)
}

export async function updateUnit(req: Request, res: Response) {
  try {
    const unit = await prisma.unit.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        type: req.body.type,
        address: req.body.address,
        phone: req.body.phone,
        adminName: req.body.adminName,
      },
    })
    res.json(unit)
  } catch {
    res.status(404).json({ error: 'Unit not found' })
  }
}

export async function deleteUnit(req: Request, res: Response) {
  const unit = await prisma.unit.findUnique({ where: { id: req.params.id } })
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
      await tx.doctor.deleteMany({ where: { id: { in: doctorIds } } })
    }
    await tx.receptionist.deleteMany({ where: { unitId: unit.id } })
    await tx.unit.delete({ where: { id: unit.id } })
  })

  res.status(204).send()
}
