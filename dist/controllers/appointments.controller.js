import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
import { getScheduleViolation } from '../utils/schedule.js';
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
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const scheduleViolation = await getScheduleViolation(req.body.doctorId, start, end);
    if (scheduleViolation) {
        res.status(409).json({ error: scheduleViolation });
        return;
    }
    const conflict = await prisma.appointment.findFirst({
        where: {
            doctorId: req.body.doctorId,
            status: { not: 'cancelled' },
            start: { lt: end },
            end: { gt: start },
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
            start,
            end,
            status: req.body.status ?? 'scheduled',
            notes: req.body.notes ?? null,
            paymentType: req.body.paymentType ?? null,
            cancellationReason: req.body.cancellationReason ?? null,
            cancelledAt: req.body.status === 'cancelled' ? new Date() : null,
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
    const status = req.body.status ?? existing.status;
    if (status !== 'cancelled') {
        const scheduleViolation = await getScheduleViolation(doctorId, start, end);
        if (scheduleViolation) {
            res.status(409).json({ error: scheduleViolation });
            return;
        }
        const conflict = await prisma.appointment.findFirst({
            where: {
                id: { not: getIdParam(req) },
                doctorId,
                status: { not: 'cancelled' },
                start: { lt: end },
                end: { gt: start },
            },
        });
        if (conflict) {
            res.status(409).json({ error: 'Overlap with existing appointment' });
            return;
        }
    }
    const appointment = await prisma.appointment.update({
        where: { id: getIdParam(req) },
        data: {
            doctorId,
            patientId: req.body.patientId,
            title: req.body.title,
            start,
            end,
            status,
            notes: req.body.notes ?? existing.notes,
            paymentType: req.body.paymentType ?? existing.paymentType,
            cancellationReason: req.body.cancellationReason ?? existing.cancellationReason,
            cancelledAt: req.body.status === 'cancelled'
                ? (existing.cancelledAt ?? new Date())
                : req.body.status && req.body.status !== 'cancelled'
                    ? null
                    : existing.cancelledAt,
        },
    });
    res.json(appointment);
}
export async function cancelAppointment(req, res) {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: getIdParam(req) },
            data: {
                status: 'cancelled',
                cancellationReason: req.body.reason ?? null,
                cancelledAt: new Date(),
            },
        });
        res.json(appointment);
    }
    catch {
        res.status(404).json({ error: 'Appointment not found' });
    }
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
