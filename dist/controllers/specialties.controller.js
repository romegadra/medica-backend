import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
export async function listSpecialties(_req, res) {
    const specialties = await prisma.specialty.findMany({ orderBy: { name: 'asc' } });
    res.json(specialties);
}
export async function getSpecialty(req, res) {
    const specialty = await prisma.specialty.findUnique({ where: { id: getIdParam(req) } });
    if (!specialty) {
        res.status(404).json({ error: 'Specialty not found' });
        return;
    }
    res.json(specialty);
}
export async function createSpecialty(req, res) {
    const specialty = await prisma.specialty.create({
        data: {
            name: req.body.name,
        },
    });
    res.status(201).json(specialty);
}
export async function updateSpecialty(req, res) {
    try {
        const specialty = await prisma.specialty.update({
            where: { id: getIdParam(req) },
            data: { name: req.body.name },
        });
        res.json(specialty);
    }
    catch {
        res.status(404).json({ error: 'Specialty not found' });
    }
}
export async function deleteSpecialty(req, res) {
    const specialty = await prisma.specialty.findUnique({ where: { id: getIdParam(req) } });
    if (!specialty) {
        res.status(404).json({ error: 'Specialty not found' });
        return;
    }
    await prisma.$transaction(async (tx) => {
        await tx.doctor.updateMany({
            where: { specialtyId: specialty.id },
            data: { specialtyId: null },
        });
        const templates = await tx.specialtyTemplate.findMany({
            where: { specialtyId: specialty.id },
            select: { id: true },
        });
        const templateIds = templates.map((item) => item.id);
        if (templateIds.length) {
            await tx.specialtyField.deleteMany({ where: { templateId: { in: templateIds } } });
            await tx.specialtyTemplate.deleteMany({ where: { id: { in: templateIds } } });
        }
        await tx.specialty.delete({ where: { id: specialty.id } });
    });
    res.status(204).send();
}
