import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'
import { localParts } from '../utils/schedule.js'

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
  const recurrenceType = req.body.recurrenceType === 'weekly' ? 'weekly' : 'date'
  const start = new Date(req.body.start)
  const end = new Date(req.body.end)
  const dayOfWeek = Number(req.body.dayOfWeek)
  const startTime = typeof req.body.startTime === 'string' ? req.body.startTime : undefined
  const endTime = typeof req.body.endTime === 'string' ? req.body.endTime : undefined
  const hasValidDateRange = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end
  const hasValidWeeklyRange =
    Number.isInteger(dayOfWeek) &&
    dayOfWeek >= 0 &&
    dayOfWeek <= 6 &&
    Boolean(startTime) &&
    Boolean(endTime) &&
    startTime! < endTime!

  if (
    !req.body.doctorId ||
    (recurrenceType === 'date' && !hasValidDateRange) ||
    (recurrenceType === 'weekly' && !hasValidWeeklyRange)
  ) {
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

  const conflict =
    recurrenceType === 'date'
      ? await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            status: { not: 'cancelled' },
            start: { lt: end },
            end: { gt: start },
          },
        })
      : (
          await prisma.appointment.findMany({
            where: {
              doctorId: doctor.id,
              status: { not: 'cancelled' },
              end: { gt: new Date() },
            },
          })
        ).find((appointment) => {
          const appointmentStart = localParts(appointment.start)
          const appointmentEnd = localParts(appointment.end)
          if (appointmentStart.dayOfWeek !== dayOfWeek || appointmentEnd.dayOfWeek !== dayOfWeek) {
            return false
          }
          return appointmentStart.minuteOfDay < timeToMinutes(endTime!) && timeToMinutes(startTime!) < appointmentEnd.minuteOfDay
        })
  if (conflict) {
    res.status(409).json({ error: 'El bloqueo se cruza con una cita existente.' })
    return
  }

  const existingBlock =
    recurrenceType === 'date'
      ? await findDateBlockConflict(doctor.id, start, end)
      : await findWeeklyBlockConflict(doctor.id, dayOfWeek, startTime!, endTime!)
  if (existingBlock) {
    res.status(409).json({ error: 'El bloqueo se cruza con otro bloqueo existente.' })
    return
  }

  const block = await prisma.doctorBlockedTime.create({
    data: {
      doctorId: doctor.id,
      start: recurrenceType === 'date' ? start : new Date(),
      end: recurrenceType === 'date' ? end : new Date(Date.now() + 60000),
      reason: req.body.reason ?? null,
      recurrenceType,
      dayOfWeek: recurrenceType === 'weekly' ? dayOfWeek : null,
      startTime: recurrenceType === 'weekly' ? startTime : null,
      endTime: recurrenceType === 'weekly' ? endTime : null,
    },
  })
  res.status(201).json(block)
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function minutesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA
}

async function findDateBlockConflict(doctorId: string, start: Date, end: Date) {
  const dateBlock = await prisma.doctorBlockedTime.findFirst({
    where: {
      doctorId,
      recurrenceType: 'date',
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (dateBlock) return dateBlock

  const localStart = localParts(start)
  const localEnd = localParts(end)
  if (localStart.dayOfWeek !== localEnd.dayOfWeek) return null

  const weeklyBlocks = await prisma.doctorBlockedTime.findMany({
    where: {
      doctorId,
      recurrenceType: 'weekly',
      dayOfWeek: localStart.dayOfWeek,
    },
  })
  return (
    weeklyBlocks.find((block) =>
      block.startTime && block.endTime
        ? minutesOverlap(
            localStart.minuteOfDay,
            localEnd.minuteOfDay,
            timeToMinutes(block.startTime),
            timeToMinutes(block.endTime),
          )
        : false,
    ) ?? null
  )
}

async function findWeeklyBlockConflict(
  doctorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const weeklyBlocks = await prisma.doctorBlockedTime.findMany({
    where: {
      doctorId,
      recurrenceType: 'weekly',
      dayOfWeek,
    },
  })
  return (
    weeklyBlocks.find((block) =>
      block.startTime && block.endTime
        ? minutesOverlap(startMinutes, endMinutes, timeToMinutes(block.startTime), timeToMinutes(block.endTime))
        : false,
    ) ?? null
  )
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
