import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

type AuthPayload = {
  role: string
  doctorId?: string
  unitId?: string
}

const secret = process.env.JWT_SECRET || 'dev-secret'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, secret) as AuthPayload
    req.auth = payload
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth
    if (!auth || !roles.includes(auth.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
