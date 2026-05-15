import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

function canAccessDoctor(auth: Request['auth'], doctor: { id: string; unitId: string }) {
  if (!auth) return false
  if (auth.role === 'superadmin') return true
  if (auth.role === 'doctor') return auth.doctorId === doctor.id
  return Boolean(auth.unitId && auth.unitId === doctor.unitId)
}

export async function listDoctorBlockedTimes(req: Request, res: Response) {
  const requestedDoctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined
  const where: Prisma.DoctorBlockedTimeWhereInput = {}

  if (requestedDoctorId) {
    where.doctorId = requestedDoctorId
  }
  if (req.auth?.role === 'doctor') {
    where.doctorId = req.auth.doctorId ?? '__none__'
  } else if (req.auth?.unitId) {
    where.doctor = { unitId: req.auth.unitId }
  }

  const blocks = await prisma.doctorBlockedTime.findMany({
    where,
    orderBy: { start: 'asc' },
  })
  res.json(blocks)
}

export async function createDoctorBlockedTime(req: Request, res: Response) {
  const start = new Date(req.body.start)
  const end = new Date(req.body.end)
  if (!req.body.doctorId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    res.status(400).json({ error: 'Invalid blocked time' })
    return
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: req.body.doctorId },
    select: { id: true, unitId: true },
  })
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' })
    return
  }
  if (!canAccessDoctor(req.auth, doctor)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      status: { not: 'cancelled' },
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (conflict) {
    res.status(409).json({ error: 'El bloqueo se cruza con una cita existente.' })
    return
  }

  const existingBlock = await prisma.doctorBlockedTime.findFirst({
    where: {
      doctorId: doctor.id,
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (existingBlock) {
    res.status(409).json({ error: 'El bloqueo se cruza con otro bloqueo existente.' })
    return
  }

  const block = await prisma.doctorBlockedTime.create({
    data: {
      doctorId: doctor.id,
      start,
      end,
      reason: req.body.reason ?? null,
    },
  })
  res.status(201).json(block)
}

export async function deleteDoctorBlockedTime(req: Request, res: Response) {
  const block = await prisma.doctorBlockedTime.findUnique({
    where: { id: getIdParam(req) },
    include: { doctor: { select: { id: true, unitId: true } } },
  })
  if (!block) {
    res.status(404).json({ error: 'Blocked time not found' })
    return
  }
  if (!canAccessDoctor(req.auth, block.doctor)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  await prisma.doctorBlockedTime.delete({ where: { id: block.id } })
  res.status(204).send()
}
