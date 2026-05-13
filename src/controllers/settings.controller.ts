import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'

const settingsId = 'default'

function normalizeSettings(body: {
  startHour?: unknown
  endHour?: unknown
  slotMinutes?: unknown
  allowOverlap?: unknown
}) {
  const startHour = Number(body.startHour)
  const endHour = Number(body.endHour)
  const slotMinutes = Number(body.slotMinutes)
  const allowOverlap = Boolean(body.allowOverlap)

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
    slotMinutes > 120
  ) {
    return null
  }

  return { startHour, endHour, slotMinutes, allowOverlap }
}

export async function getSettings(_req: Request, res: Response) {
  const settings = await prisma.appSettings.upsert({
    where: { id: settingsId },
    update: {},
    create: { id: settingsId },
  })
  res.json(settings)
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
