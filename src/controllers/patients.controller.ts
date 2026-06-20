import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'
import { normalizePhone } from '../utils/phone.js'
import { writeAuditLog } from '../services/audit.service.js'

function normalizePatientName(name?: string | null) {
  return (name ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

async function findDuplicatePatient(input: {
  doctorId: string
  name?: string | null
  phone?: string | null
  ignoreId?: string
}) {
  const normalizedName = normalizePatientName(input.name)
  const normalizedPhone = normalizePhone(input.phone ?? undefined)
  const existingPatients = await prisma.patient.findMany({
    where: { doctorId: input.doctorId },
    select: { id: true, name: true, phone: true },
  })

  return existingPatients.find((patient) => {
    if (patient.id === input.ignoreId) return false
    if (normalizedPhone && normalizePhone(patient.phone ?? undefined) === normalizedPhone) return true
    return normalizedName.length > 0 && normalizePatientName(patient.name) === normalizedName
  })
}

export async function listPatients(req: Request, res: Response) {
  const requestedDoctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined
  const where: Prisma.PatientWhereInput = {}

  if (requestedDoctorId) {
    where.doctorId = requestedDoctorId
  }

  if (req.auth?.role === 'doctor') {
    where.doctorId = req.auth.doctorId ?? '__none__'
  } else if (req.auth?.unitId) {
    where.doctor = { unitId: req.auth.unitId }
  }

  const patients = await prisma.patient.findMany({ where, orderBy: { name: 'asc' } })
  res.json(patients)
}

export async function getPatient(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({ where: { id: getIdParam(req) } })
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' })
    return
  }
  res.json(patient)
}

export async function createPatient(req: Request, res: Response) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: req.body.doctorId },
    select: { id: true, unitId: true, canEditPatients: true },
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
  if (req.auth?.role === 'doctor' && !doctor.canEditPatients) {
    res.status(403).json({ error: 'Doctor cannot edit patients' })
    return
  }
  const duplicate = await findDuplicatePatient({
    doctorId: req.body.doctorId,
    name: req.body.name,
    phone: req.body.phone,
  })
  if (duplicate) {
    res.status(409).json({ error: `El paciente ya existe: ${duplicate.name}` })
    return
  }

  const patient = await prisma.patient.create({
    data: {
      doctorId: req.body.doctorId,
      name: req.body.name,
      phone: normalizePhone(req.body.phone),
      address: req.body.address,
      historyDate: req.body.historyDate,
    },
  })
  writeAuditLog(req, {
    action: 'created',
    entityType: 'patient',
    entityId: patient.id,
    summary: `Paciente creado: ${patient.name}`,
    unitId: doctor.unitId,
    doctorId: patient.doctorId,
    after: patient,
  })
  res.status(201).json(patient)
}

export async function updatePatient(req: Request, res: Response) {
  try {
    const existing = await prisma.patient.findUnique({
      where: { id: getIdParam(req) },
      include: { doctor: { select: { unitId: true, canEditPatients: true } } },
    })
    if (!existing) {
      res.status(404).json({ error: 'Patient not found' })
      return
    }
    if (
      (req.auth?.role === 'doctor' && req.auth.doctorId !== existing.doctorId) ||
      (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== existing.doctor.unitId)
    ) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (req.auth?.role === 'doctor' && !existing.doctor.canEditPatients) {
      res.status(403).json({ error: 'Doctor cannot edit patients' })
      return
    }
    const duplicate = await findDuplicatePatient({
      doctorId: req.body.doctorId ?? existing.doctorId,
      name: req.body.name,
      phone: req.body.phone,
      ignoreId: existing.id,
    })
    if (duplicate) {
      res.status(409).json({ error: `El paciente ya existe: ${duplicate.name}` })
      return
    }
    const patient = await prisma.patient.update({
      where: { id: getIdParam(req) },
      data: {
        doctorId: req.body.doctorId,
        name: req.body.name,
        phone: normalizePhone(req.body.phone),
        address: req.body.address,
        historyDate: req.body.historyDate,
      },
      include: { doctor: { select: { unitId: true } } },
    })
    writeAuditLog(req, {
      action: 'updated',
      entityType: 'patient',
      entityId: patient.id,
      summary: `Paciente actualizado: ${patient.name}`,
      unitId: patient.doctor.unitId,
      doctorId: patient.doctorId,
      before: existing,
      after: patient,
    })
    res.json(patient)
  } catch {
    res.status(404).json({ error: 'Patient not found' })
  }
}

export async function deletePatient(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { id: getIdParam(req) },
    include: { doctor: { select: { unitId: true, canEditPatients: true } } },
  })
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' })
    return
  }
  if (
    (req.auth?.role === 'doctor' && req.auth.doctorId !== patient.doctorId) ||
    (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== patient.doctor.unitId)
  ) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (req.auth?.role === 'doctor' && !patient.doctor.canEditPatients) {
    res.status(403).json({ error: 'Doctor cannot edit patients' })
    return
  }
  await prisma.$transaction(async (tx) => {
    await tx.visitEntry.deleteMany({ where: { patientId: patient.id } })
    await tx.appointment.deleteMany({ where: { patientId: patient.id } })
    await tx.patient.delete({ where: { id: patient.id } })
  })
  writeAuditLog(req, {
    action: 'deleted',
    entityType: 'patient',
    entityId: patient.id,
    summary: `Paciente eliminado: ${patient.name}`,
    unitId: patient.doctor.unitId,
    doctorId: patient.doctorId,
    before: patient,
  })
  res.status(204).send()
}
