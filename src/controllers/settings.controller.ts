import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { sendAppointmentReminders } from '../services/notifications.service.js'

const settingsId = 'default'

function normalizeSettings(body: {
  startHour?: unknown
  endHour?: unknown
  slotMinutes?: unknown
  allowOverlap?: unknown
  appointmentRemindersEnabled?: unknown
  appointmentReminderIntervalMinutes?: unknown
  whatsappPatientNotificationsEnabled?: unknown
  whatsappDoctorNotificationsEnabled?: unknown
}) {
  const startHour = Number(body.startHour)
  const endHour = Number(body.endHour)
  const slotMinutes = Number(body.slotMinutes)
  const allowOverlap = Boolean(body.allowOverlap)
  const appointmentRemindersEnabled = Boolean(body.appointmentRemindersEnabled)
  const appointmentReminderIntervalMinutes = Number(body.appointmentReminderIntervalMinutes)
  const whatsappPatientNotificationsEnabled = Boolean(body.whatsappPatientNotificationsEnabled)
  const whatsappDoctorNotificationsEnabled = Boolean(body.whatsappDoctorNotificationsEnabled)

  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    !Number.isInteger(slotMinutes) ||
    startHour < 0 ||
    startHour > 23 ||
    endHour < 1 ||
    endHour > 24 ||
    startHour >= endHour ||
    slotMinutes < 10 ||
    slotMinutes > 120 ||
    !Number.isInteger(appointmentReminderIntervalMinutes) ||
    appointmentReminderIntervalMinutes < 5 ||
    appointmentReminderIntervalMinutes > 1440
  ) {
    return null
  }

  return {
    startHour,
    endHour,
    slotMinutes,
    allowOverlap,
    appointmentRemindersEnabled,
    appointmentReminderIntervalMinutes,
    whatsappPatientNotificationsEnabled,
    whatsappDoctorNotificationsEnabled,
  }
}

export async function getSettings(_req: Request, res: Response) {
  const settings = await prisma.appSettings.upsert({
    where: { id: settingsId },
    update: {},
    create: { id: settingsId },
  })
  res.json(settings)
}

export async function runAppointmentRemindersNow(_req: Request, res: Response) {
  const count = await sendAppointmentReminders({ force: true })
  res.json({ ok: true, count })
}

export async function updateSettings(req: Request, res: Response) {
  const next = normalizeSettings(req.body)
  if (!next) {
    res.status(400).json({ error: 'Invalid settings' })
    return
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: settingsId },
    update: next,
    create: { id: settingsId, ...next },
  })
  res.json(settings)
}
