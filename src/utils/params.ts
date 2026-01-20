import type { Request } from 'express'

export function getIdParam(req: Request) {
  const value = req.params.id
  return Array.isArray(value) ? value[0] : value
}
