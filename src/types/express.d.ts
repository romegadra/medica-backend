import type { Request } from 'express'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      role: string
      doctorId?: string
      unitId?: string
    }
  }
}
