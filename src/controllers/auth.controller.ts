import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'

const secret = process.env.JWT_SECRET || 'dev-secret'

function validatePassword(password: string) {
  const minLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  return minLength && hasUpper && hasLower && hasNumber
}

export function login(req: Request, res: Response) {
  void (async () => {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        doctorId: user.doctorId ?? undefined,
        unitId: user.unitId ?? undefined,
      },
      secret,
      { expiresIn: '7d' },
    )
    res.json({
      token,
      role: user.role,
      doctorId: user.doctorId,
      unitId: user.unitId,
      mustChangePassword: user.mustChangePassword,
    })
  })()
}

export function changePassword(req: Request, res: Response) {
  void (async () => {
    const auth = req.auth
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string
      newPassword?: string
    }
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword are required' })
      return
    }
    if (!validatePassword(newPassword)) {
      res.status(400).json({
        error: 'Password must be at least 8 chars and include upper, lower, and number',
      })
      return
    }
    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const same = await bcrypt.compare(newPassword, user.password)
    if (same) {
      res.status(400).json({ error: 'New password must be different' })
      return
    }
    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    })
    res.json({ ok: true })
  })()
}
