import type { Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { getIdParam } from '../utils/params.js'

export async function listTemplates(_req: Request, res: Response) {
  const templates = await prisma.specialtyTemplate.findMany({
    include: { fields: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(templates)
}

export async function getTemplate(req: Request, res: Response) {
  const template = await prisma.specialtyTemplate.findUnique({
    where: { id: getIdParam(req) },
    include: { fields: true },
  })
  if (!template) {
    res.status(404).json({ error: 'Template not found' })
    return
  }
  res.json(template)
}

export async function createTemplate(req: Request, res: Response) {
  const template = await prisma.specialtyTemplate.create({
    data: {
      specialtyId: req.body.specialtyId,
      fields: {
        create: (req.body.fields ?? []).map((field: any) => ({
          label: field.label,
          type: field.type,
          required: field.required ?? false,
        })),
      },
    },
    include: { fields: true },
  })
  res.status(201).json(template)
}

export async function updateTemplate(req: Request, res: Response) {
  const exists = await prisma.specialtyTemplate.findUnique({ where: { id: getIdParam(req) } })
  if (!exists) {
    res.status(404).json({ error: 'Template not found' })
    return
  }
  const template = await prisma.$transaction(async (tx) => {
    if (req.body.fields) {
      await tx.specialtyField.deleteMany({ where: { templateId: getIdParam(req) } })
    }
    return tx.specialtyTemplate.update({
      where: { id: getIdParam(req) },
      data: {
        specialtyId: req.body.specialtyId,
        fields: req.body.fields
          ? {
              create: req.body.fields.map((field: any) => ({
                label: field.label,
                type: field.type,
                required: field.required ?? false,
              })),
            }
          : undefined,
      },
      include: { fields: true },
    })
  })
  res.json(template)
}

export async function deleteTemplate(req: Request, res: Response) {
  try {
    await prisma.specialtyField.deleteMany({ where: { templateId: getIdParam(req) } })
    await prisma.specialtyTemplate.delete({ where: { id: getIdParam(req) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Template not found' })
  }
}
