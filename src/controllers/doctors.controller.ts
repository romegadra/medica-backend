import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

export async function listDoctors(_req: Request, res: Response) {
  const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } })
  res.json(doctors)
}

export async function getDoctor(req: Request, res: Response) {
  const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } })
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' })
    return
  }
  res.json(doctor)
}

export async function createDoctor(req: Request, res: Response) {
  const email = req.body.email as string | undefined
  if (!email) {
    res.status(400).json({ error: 'email is required' })
    return
  }
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
  const hash = await bcrypt.hash(defaultPassword, 10)
  const doctor = await prisma.$transaction(async (tx) => {
    const created = await tx.doctor.create({
      data: {
        name: req.body.name,
        email,
        unitId: req.body.unitId,
        specialtyId: req.body.specialtyId ?? null,
        phone: req.body.phone,
        licenseNumber: req.body.licenseNumber,
        canEditPatients: req.body.canEditPatients ?? true,
        canManageVisits: req.body.canManageVisits ?? true,
      },
    })
    await tx.user.create({
      data: {
        email,
        password: hash,
        role: 'doctor',
        doctorId: created.id,
        unitId: created.unitId,
        mustChangePassword: true,
      },
    })
    return created
  })
  res.status(201).json(doctor)
}

export async function updateDoctor(req: Request, res: Response) {
  try {
    const doctorId = getIdParam(req)
    const doctor = await prisma.$transaction(async (tx) => {
      const existing = await tx.doctor.findUnique({ where: { id: doctorId } })
      if (!existing) {
        return null
      }
      const updated = await tx.doctor.update({
        where: { id: doctorId },
        data: {
          name: req.body.name,
          email: req.body.email ?? existing.email,
          unitId: req.body.unitId,
          specialtyId: req.body.specialtyId ?? null,
          phone: req.body.phone,
          licenseNumber: req.body.licenseNumber,
          canEditPatients: req.body.canEditPatients,
          canManageVisits: req.body.canManageVisits,
        },
      })
      if (req.body.email && req.body.email !== existing.email) {
        if (existing.email) {
          await tx.user.updateMany({
            where: { doctorId: doctorId },
            data: { email: req.body.email, unitId: updated.unitId },
          })
        } else {
          const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
          const hash = await bcrypt.hash(defaultPassword, 10)
          await tx.user.create({
            data: {
              email: req.body.email,
              password: hash,
              role: 'doctor',
              doctorId: doctorId,
              unitId: updated.unitId,
              mustChangePassword: true,
            },
          })
        }
      } else if (req.body.unitId) {
        await tx.user.updateMany({
          where: { doctorId: doctorId },
          data: { unitId: updated.unitId },
        })
      }
      return updated
    })
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }
    res.json(doctor)
  } catch {
    res.status(404).json({ error: 'Doctor not found' })
  }
}

export async function deleteDoctor(req: Request, res: Response) {
  const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } })
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' })
    return
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { doctorId: doctor.id } })
    await tx.visitEntry.deleteMany({ where: { doctorId: doctor.id } })
    await tx.appointment.deleteMany({ where: { doctorId: doctor.id } })
    await tx.patient.deleteMany({ where: { doctorId: doctor.id } })
    await tx.doctor.delete({ where: { id: doctor.id } })
  })
  res.status(204).send()
}
