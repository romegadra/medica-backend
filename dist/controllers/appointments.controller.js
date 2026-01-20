import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
export async function listAppointments(_req, res) {
    const appointments = await prisma.appointment.findMany({
        orderBy: { start: 'asc' },
    });
    res.json(appointments);
}
export async function getAppointment(req, res) {
    const appointment = await prisma.appointment.findUnique({ where: { id: getIdParam(req) } });
    if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
    }
    res.json(appointment);
}
export async function createAppointment(req, res) {
    const conflict = await prisma.appointment.findFirst({
        where: {
            doctorId: req.body.doctorId,
            start: { lt: new Date(req.body.end) },
            end: { gt: new Date(req.body.start) },
        },
    });
    if (conflict) {
        res.status(409).json({ error: 'Overlap with existing appointment' });
        return;
    }
    const appointment = await prisma.appointment.create({
        data: {
            doctorId: req.body.doctorId,
            patientId: req.body.patientId,
            title: req.body.title,
            start: new Date(req.body.start),
            end: new Date(req.body.end),
        },
    });
    res.status(201).json(appointment);
}
export async function updateAppointment(req, res) {
    const existing = await prisma.appointment.findUnique({ where: { id: getIdParam(req) } });
    if (!existing) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
    }
    const start = req.body.start ? new Date(req.body.start) : existing.start;
    const end = req.body.end ? new Date(req.body.end) : existing.end;
    const doctorId = req.body.doctorId ?? existing.doctorId;
    const conflict = await prisma.appointment.findFirst({
        where: {
            id: { not: getIdParam(req) },
            doctorId,
            start: { lt: end },
            end: { gt: start },
        },
    });
    if (conflict) {
        res.status(409).json({ error: 'Overlap with existing appointment' });
        return;
    }
    const appointment = await prisma.appointment.update({
        where: { id: getIdParam(req) },
        data: {
            doctorId,
            patientId: req.body.patientId,
            title: req.body.title,
            start,
            end,
        },
    });
    res.json(appointment);
}
export async function deleteAppointment(req, res) {
    try {
        await prisma.appointment.delete({ where: { id: getIdParam(req) } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: 'Appointment not found' });
    }
}
