import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'
import { getScheduleViolation } from '../utils/schedule.js'
import { notifyAppointment } from '../services/notifications.service.js'
import { writeAuditLog } from '../services/audit.service.js'

export async function listAppointments(req: Request, res: Response) {
  const requestedDoctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined
  const where: Prisma.AppointmentWhereInput = {}

  if (requestedDoctorId) {
    where.doctorId = requestedDoctorId
  }

  if (req.auth?.role === 'doctor') {
    where.doctorId = req.auth.doctorId ?? '__none__'
  } else if (req.auth?.unitId) {
    where.doctor = { unitId: req.auth.unitId }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { start: 'asc' },
  })
  res.json(appointments)
}

export async function getAppointment(req: Request, res: Response) {
  const appointment = await prisma.appointment.findUnique({ where: { id: getIdParam(req) } })
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' })
    return
  }
  res.json(appointment)
}

export async function createAppointment(req: Request, res: Response) {
  const start = new Date(req.body.start)
  const end = new Date(req.body.end)
  const patient = await prisma.patient.findFirst({
    where: { id: req.body.patientId, doctorId: req.body.doctorId },
    include: { doctor: { select: { unitId: true, canManageVisits: true } } },
  })
  if (!patient) {
    res.status(400).json({ error: 'Patient not found for selected doctor' })
    return
  }
  if (
    (req.auth?.role === 'doctor' && req.auth.doctorId !== req.body.doctorId) ||
    (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== patient.doctor.unitId)
  ) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (req.auth?.role === 'doctor' && !patient.doctor.canManageVisits) {
    res.status(403).json({ error: 'Doctor cannot manage appointments' })
    return
  }

  const scheduleViolation = await getScheduleViolation(req.body.doctorId, start, end)
  if (scheduleViolation) {
    res.status(409).json({ error: scheduleViolation })
    return
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: req.body.doctorId,
      status: { not: 'cancelled' },
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (conflict) {
    res.status(409).json({ error: 'Overlap with existing appointment' })
    return
  }
  const appointment = await prisma.appointment.create({
    data: {
      doctorId: req.body.doctorId,
      patientId: req.body.patientId,
      title: req.body.title,
      start,
      end,
      status: req.body.status ?? 'scheduled',
      attended: req.body.attended ?? false,
      notes: req.body.notes ?? null,
      paymentType: req.body.paymentType ?? null,
      cancellationReason: req.body.cancellationReason ?? null,
      cancelledAt: req.body.status === 'cancelled' ? new Date() : null,
    },
  })
  writeAuditLog(req, {
    action: 'created',
    entityType: 'appointment',
    entityId: appointment.id,
    summary: `Cita creada para ${appointment.title}`,
    unitId: patient.doctor.unitId,
    doctorId: appointment.doctorId,
    after: appointment,
  })
  void notifyAppointment('created', appointment.id)
  res.status(201).json(appointment)
}

export async function updateAppointment(req: Request, res: Response) {
  const existing = await prisma.appointment.findUnique({
    where: { id: getIdParam(req) },
    include: { doctor: { select: { unitId: true, canManageVisits: true } } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Appointment not found' })
    return
  }
  const start = req.body.start ? new Date(req.body.start) : existing.start
  const end = req.body.end ? new Date(req.body.end) : existing.end
  const doctorId = req.body.doctorId ?? existing.doctorId
  const status = req.body.status ?? existing.status
  const statusChanged = status !== existing.status
  const scheduleChanged =
    start.getTime() !== existing.start.getTime() ||
    end.getTime() !== existing.end.getTime() ||
    doctorId !== existing.doctorId
  if (
    (req.auth?.role === 'doctor' && req.auth.doctorId !== existing.doctorId) ||
    (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== existing.doctor.unitId)
  ) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (req.auth?.role === 'doctor' && !existing.doctor.canManageVisits) {
    res.status(403).json({ error: 'Doctor cannot manage appointments' })
    return
  }
  if (status !== 'cancelled') {
    const scheduleViolation = await getScheduleViolation(doctorId, start, end)
    if (scheduleViolation) {
      res.status(409).json({ error: scheduleViolation })
      return
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        id: { not: getIdParam(req) },
        doctorId,
        status: { not: 'cancelled' },
        start: { lt: end },
        end: { gt: start },
      },
    })
    if (conflict) {
      res.status(409).json({ error: 'Overlap with existing appointment' })
      return
    }
  }
  const appointment = await prisma.appointment.update({
    where: { id: getIdParam(req) },
    data: {
      doctorId,
      patientId: req.body.patientId,
      title: req.body.title,
      start,
      end,
      status,
      attended: req.body.attended ?? existing.attended,
      notes: req.body.notes ?? existing.notes,
      paymentType: req.body.paymentType ?? existing.paymentType,
      cancellationReason: req.body.cancellationReason ?? existing.cancellationReason,
      cancelledAt:
        req.body.status === 'cancelled'
          ? (existing.cancelledAt ?? new Date())
          : req.body.status && req.body.status !== 'cancelled'
            ? null
            : existing.cancelledAt,
    },
  })
  writeAuditLog(req, {
    action:
      appointment.status === 'cancelled'
        ? 'cancelled'
        : appointment.status === 'rescheduled' || scheduleChanged
          ? 'rescheduled'
          : 'updated',
    entityType: 'appointment',
    entityId: appointment.id,
    summary:
      appointment.status === 'cancelled'
        ? `Cita cancelada para ${appointment.title}`
        : appointment.status === 'rescheduled' || scheduleChanged
        ? `Cita reagendada para ${appointment.title}`
        : `Cita actualizada para ${appointment.title}`,
    unitId: existing.doctor.unitId,
    doctorId: appointment.doctorId,
    before: existing,
    after: appointment,
  })
  if (appointment.status === 'cancelled') {
    void notifyAppointment('cancelled', appointment.id)
  } else if (statusChanged || scheduleChanged || req.body.start || req.body.end) {
    void notifyAppointment('updated', appointment.id)
  }
  res.json(appointment)
}

export async function cancelAppointment(req: Request, res: Response) {
  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: getIdParam(req) },
      include: { doctor: { select: { unitId: true, canManageVisits: true } } },
    })
    if (!existing) {
      res.status(404).json({ error: 'Appointment not found' })
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
      res.status(403).json({ error: 'Doctor cannot manage appointments' })
      return
    }
    const appointment = await prisma.appointment.update({
      where: { id: getIdParam(req) },
      data: {
        status: 'cancelled',
        cancellationReason: req.body.reason ?? null,
        cancelledAt: new Date(),
      },
      include: { doctor: { select: { unitId: true, canManageVisits: true } } },
    })
    writeAuditLog(req, {
      action: 'cancelled',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Cita cancelada para ${appointment.title}`,
      unitId: appointment.doctor.unitId,
      doctorId: appointment.doctorId,
      after: appointment,
    })
    void notifyAppointment('cancelled', appointment.id)
    res.json(appointment)
  } catch {
    res.status(404).json({ error: 'Appointment not found' })
  }
}

export async function deleteAppointment(req: Request, res: Response) {
  try {
    const appointment = await prisma.appointment.delete({
      where: { id: getIdParam(req) },
      include: { doctor: { select: { unitId: true } } },
    })
    writeAuditLog(req, {
      action: 'deleted',
      entityType: 'appointment',
      entityId: appointment.id,
      summary: `Cita eliminada para ${appointment.title}`,
      unitId: appointment.doctor.unitId,
      doctorId: appointment.doctorId,
      before: appointment,
    })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Appointment not found' })
  }
}
