import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

const adminRoles = ['admin', 'superadmin']

function canManageAdmins(req: Request) {
  return req.auth?.role === 'superadmin' || (req.auth?.role === 'admin' && !req.auth.unitId)
}

function sanitizeUser(user: {
  id: string
  email: string
  role: string
  unitId: string | null
  mustChangePassword: boolean
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    unitId: user.unitId,
    mustChangePassword: user.mustChangePassword,
  }
}

export async function listAdminUsers(req: Request, res: Response) {
  if (!canManageAdmins(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const users = await prisma.user.findMany({
    where: { role: { in: adminRoles } },
    orderBy: { email: 'asc' },
  })
  res.json(users.map(sanitizeUser))
}

export async function createAdminUser(req: Request, res: Response) {
  if (!canManageAdmins(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const email = req.body.email as string | undefined
  const role = req.body.role as string | undefined
  if (!email || !role || !adminRoles.includes(role)) {
    res.status(400).json({ error: 'email and valid role are required' })
    return
  }
  if (role === 'admin' && !req.body.unitId) {
    res.status(400).json({ error: 'unitId is required for unit admin' })
    return
  }

  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
  const hash = await bcrypt.hash(defaultPassword, 10)
  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      role,
      unitId: role === 'superadmin' ? null : req.body.unitId,
      mustChangePassword: true,
    },
  })
  res.status(201).json(sanitizeUser(user))
}

export async function updateAdminUser(req: Request, res: Response) {
  if (!canManageAdmins(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const role = req.body.role as string | undefined
  if (!role || !adminRoles.includes(role)) {
    res.status(400).json({ error: 'valid role is required' })
    return
  }
  if (role === 'admin' && !req.body.unitId) {
    res.status(400).json({ error: 'unitId is required for unit admin' })
    return
  }

  try {
    const user = await prisma.user.update({
      where: { id: getIdParam(req) },
      data: {
        email: req.body.email,
        role,
        unitId: role === 'superadmin' ? null : req.body.unitId,
      },
    })
    res.json(sanitizeUser(user))
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
}

export async function resetAdminUserPassword(req: Request, res: Response) {
  if (!canManageAdmins(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234'
  const hash = await bcrypt.hash(defaultPassword, 10)
  try {
    const user = await prisma.user.update({
      where: { id: getIdParam(req) },
      data: { password: hash, mustChangePassword: true },
    })
    res.json(sanitizeUser(user))
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
}

export async function deleteAdminUser(req: Request, res: Response) {
  if (!canManageAdmins(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  try {
    await prisma.user.delete({ where: { id: getIdParam(req) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
}
