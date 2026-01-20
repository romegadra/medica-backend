import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'

export async function listPatients(_req: Request, res: Response) {
  const patients = await prisma.patient.findMany({ orderBy: { name: 'asc' } })
  res.json(patients)
}

export async function getPatient(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } })
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' })
    return
  }
  res.json(patient)
}

export async function createPatient(req: Request, res: Response) {
  const patient = await prisma.patient.create({
    data: {
      doctorId: req.body.doctorId,
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      historyDate: req.body.historyDate,
    },
  })
  res.status(201).json(patient)
}

export async function updatePatient(req: Request, res: Response) {
  try {
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        doctorId: req.body.doctorId,
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address,
        historyDate: req.body.historyDate,
      },
    })
    res.json(patient)
  } catch {
    res.status(404).json({ error: 'Patient not found' })
  }
}

export async function deletePatient(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } })
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' })
    return
  }
  await prisma.$transaction(async (tx) => {
    await tx.visitEntry.deleteMany({ where: { patientId: patient.id } })
    await tx.appointment.deleteMany({ where: { patientId: patient.id } })
    await tx.patient.delete({ where: { id: patient.id } })
  })
  res.status(204).send()
}
