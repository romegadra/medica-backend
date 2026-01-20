import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

export async function listReceptionists(_req: Request, res: Response) {
  const receptionists = await prisma.receptionist.findMany({ orderBy: { name: 'asc' } })
  res.json(receptionists)
}

export async function getReceptionist(req: Request, res: Response) {
  const receptionist = await prisma.receptionist.findUnique({ where: { id: getIdParam(req) } })
  if (!receptionist) {
    res.status(404).json({ error: 'Receptionist not found' })
    return
  }
  res.json(receptionist)
}

export async function createReceptionist(req: Request, res: Response) {
  const receptionist = await prisma.receptionist.create({
    data: {
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      unitId: req.body.unitId,
    },
  })
  res.status(201).json(receptionist)
}

export async function updateReceptionist(req: Request, res: Response) {
  try {
    const receptionist = await prisma.receptionist.update({
      where: { id: getIdParam(req) },
      data: {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        unitId: req.body.unitId,
      },
    })
    res.json(receptionist)
  } catch {
    res.status(404).json({ error: 'Receptionist not found' })
  }
}

export async function deleteReceptionist(req: Request, res: Response) {
  try {
    await prisma.receptionist.delete({ where: { id: getIdParam(req) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Receptionist not found' })
  }
}
