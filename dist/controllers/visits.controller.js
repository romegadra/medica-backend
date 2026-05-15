import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
export async function listVisits(req, res) {
    const requestedDoctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : undefined;
    const where = {};
    if (requestedDoctorId) {
        where.doctorId = requestedDoctorId;
    }
    if (req.auth?.role === 'doctor') {
        where.doctorId = req.auth.doctorId ?? '__none__';
    }
    else if (req.auth?.unitId) {
        where.doctor = { unitId: req.auth.unitId };
    }
    const visits = await prisma.visitEntry.findMany({ where, orderBy: { date: 'desc' } });
    res.json(visits);
}
export async function getVisit(req, res) {
    const visit = await prisma.visitEntry.findUnique({ where: { id: getIdParam(req) } });
    if (!visit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
    }
    res.json(visit);
}
export async function createVisit(req, res) {
    const visit = await prisma.visitEntry.create({
        data: {
            doctorId: req.body.doctorId,
            patientId: req.body.patientId,
            date: new Date(req.body.date),
            templateId: req.body.templateId,
            responses: req.body.responses ?? {},
        },
    });
    res.status(201).json(visit);
}
export async function updateVisit(req, res) {
    try {
        const visit = await prisma.visitEntry.update({
            where: { id: getIdParam(req) },
            data: {
                doctorId: req.body.doctorId,
                patientId: req.body.patientId,
                date: req.body.date ? new Date(req.body.date) : undefined,
                templateId: req.body.templateId,
                responses: req.body.responses,
            },
        });
        res.json(visit);
    }
    catch {
        res.status(404).json({ error: 'Visit not found' });
    }
}
export async function deleteVisit(req, res) {
    try {
        await prisma.visitEntry.delete({ where: { id: getIdParam(req) } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: 'Visit not found' });
    }
}
