import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

function isValidTime(value: unknown) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

function isValidSchedule(body: {
  doctorId?: unknown
  dayOfWeek?: number
  startTime?: unknown
  endTime?: unknown
}) {
  return (
    typeof body.doctorId === 'string' &&
    typeof body.dayOfWeek === 'number' &&
    body.dayOfWeek >= 0 &&
    body.dayOfWeek <= 6 &&
    isValidTime(body.startTime) &&
    isValidTime(body.endTime) &&
    String(body.startTime) < String(body.endTime)
  )
}

export async function listDoctorSchedules(req: Request, res: Response) {
  const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined
  const schedules = await prisma.doctorSchedule.findMany({
    where: doctorId ? { doctorId } : undefined,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
  res.json(schedules)
}

export async function createDoctorSchedule(req: Request, res: Response) {
  if (!isValidSchedule(req.body)) {
    res.status(400).json({ error: 'Invalid schedule' })
    return
  }

  const schedule = await prisma.doctorSchedule.create({
    data: {
      doctorId: req.body.doctorId,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    },
  })
  res.status(201).json(schedule)
}

export async function updateDoctorSchedule(req: Request, res: Response) {
  if (!isValidSchedule(req.body)) {
    res.status(400).json({ error: 'Invalid schedule' })
    return
  }

  try {
    const schedule = await prisma.doctorSchedule.update({
      where: { id: getIdParam(req) },
      data: {
        doctorId: req.body.doctorId,
        dayOfWeek: req.body.dayOfWeek,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
      },
    })
    res.json(schedule)
  } catch {
    res.status(404).json({ error: 'Schedule not found' })
  }
}

export async function deleteDoctorSchedule(req: Request, res: Response) {
  try {
    await prisma.doctorSchedule.delete({ where: { id: getIdParam(req) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Schedule not found' })
  }
}
