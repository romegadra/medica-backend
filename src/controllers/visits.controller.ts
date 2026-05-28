import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

export async function listVisits(req: Request, res: Response) {
  const requestedDoctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined
  const where: Prisma.VisitEntryWhereInput = {}

  if (requestedDoctorId) {
    where.doctorId = requestedDoctorId
  }

  if (req.auth?.role === 'doctor') {
    where.doctorId = req.auth.doctorId ?? '__none__'
  } else if (req.auth?.unitId) {
    where.doctor = { unitId: req.auth.unitId }
  }

  const visits = await prisma.visitEntry.findMany({ where, orderBy: { date: 'desc' } })
  res.json(visits)
}

export async function getVisit(req: Request, res: Response) {
  const visit = await prisma.visitEntry.findUnique({ where: { id: getIdParam(req) } })
  if (!visit) {
    res.status(404).json({ error: 'Visit not found' })
    return
  }
  res.json(visit)
}

export async function createVisit(req: Request, res: Response) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: req.body.doctorId },
    select: { id: true, unitId: true, canManageVisits: true },
  })
  if (!doctor) {
    res.status(400).json({ error: 'Doctor not found' })
    return
  }
  if (
    (req.auth?.role === 'doctor' && req.auth.doctorId !== doctor.id) ||
    (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== doctor.unitId)
  ) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (req.auth?.role === 'doctor' && !doctor.canManageVisits) {
    res.status(403).json({ error: 'Doctor cannot manage visits' })
    return
  }

  const visit = await prisma.visitEntry.create({
    data: {
      doctorId: req.body.doctorId,
      patientId: req.body.patientId,
      date: new Date(req.body.date),
      templateId: req.body.templateId,
      responses: req.body.responses ?? {},
    },
  })
  res.status(201).json(visit)
}

export async function updateVisit(req: Request, res: Response) {
  try {
    const existing = await prisma.visitEntry.findUnique({
      where: { id: getIdParam(req) },
      include: { doctor: { select: { unitId: true, canManageVisits: true } } },
    })
    if (!existing) {
      res.status(404).json({ error: 'Visit not found' })
      return
    }
    if (
      (req.auth?.role === 'doctor' && req.auth.doctorId !== existing.doctorId) ||
      (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== existing.doctor.unitId)
    ) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (req.auth?.role === 'doctor' && !existing.doctor.canManageVisits) {
      res.status(403).json({ error: 'Doctor cannot manage visits' })
      return
    }

    const visit = await prisma.visitEntry.update({
      where: { id: getIdParam(req) },
      data: {
        doctorId: req.body.doctorId,
        patientId: req.body.patientId,
        date: req.body.date ? new Date(req.body.date) : undefined,
        templateId: req.body.templateId,
        responses: req.body.responses,
      },
    })
    res.json(visit)
  } catch {
    res.status(404).json({ error: 'Visit not found' })
  }
}

export async function deleteVisit(req: Request, res: Response) {
  try {
    const existing = await prisma.visitEntry.findUnique({
      where: { id: getIdParam(req) },
      include: { doctor: { select: { unitId: true, canManageVisits: true } } },
    })
    if (!existing) {
      res.status(404).json({ error: 'Visit not found' })
      return
    }
    if (
      (req.auth?.role === 'doctor' && req.auth.doctorId !== existing.doctorId) ||
      (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== existing.doctor.unitId)
    ) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (req.auth?.role === 'doctor' && !existing.doctor.canManageVisits) {
      res.status(403).json({ error: 'Doctor cannot manage visits' })
      return
    }

    await prisma.visitEntry.delete({ where: { id: getIdParam(req) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Visit not found' })
  }
}
