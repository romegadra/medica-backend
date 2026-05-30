import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
import { normalizePhone } from '../utils/phone.js';
import { writeAuditLog } from '../services/audit.service.js';
export async function listPatients(req, res) {
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
    const patients = await prisma.patient.findMany({ where, orderBy: { name: 'asc' } });
    res.json(patients);
}
export async function getPatient(req, res) {
    const patient = await prisma.patient.findUnique({ where: { id: getIdParam(req) } });
    if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
    }
    res.json(patient);
}
export async function createPatient(req, res) {
    const doctor = await prisma.doctor.findUnique({
        where: { id: req.body.doctorId },
        select: { id: true, unitId: true, canEditPatients: true },
    });
    if (!doctor) {
        res.status(400).json({ error: 'Doctor not found' });
        return;
    }
    if ((req.auth?.role === 'doctor' && req.auth.doctorId !== doctor.id) ||
        (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== doctor.unitId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    if (req.auth?.role === 'doctor' && !doctor.canEditPatients) {
        res.status(403).json({ error: 'Doctor cannot edit patients' });
        return;
    }
    const patient = await prisma.patient.create({
        data: {
            doctorId: req.body.doctorId,
            name: req.body.name,
            phone: normalizePhone(req.body.phone),
            address: req.body.address,
            historyDate: req.body.historyDate,
        },
    });
    writeAuditLog(req, {
        action: 'created',
        entityType: 'patient',
        entityId: patient.id,
        summary: `Paciente creado: ${patient.name}`,
        unitId: doctor.unitId,
        doctorId: patient.doctorId,
        after: patient,
    });
    res.status(201).json(patient);
}
export async function updatePatient(req, res) {
    try {
        const existing = await prisma.patient.findUnique({
            where: { id: getIdParam(req) },
            include: { doctor: { select: { unitId: true, canEditPatients: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        if ((req.auth?.role === 'doctor' && req.auth.doctorId !== existing.doctorId) ||
            (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== existing.doctor.unitId)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (req.auth?.role === 'doctor' && !existing.doctor.canEditPatients) {
            res.status(403).json({ error: 'Doctor cannot edit patients' });
            return;
        }
        const patient = await prisma.patient.update({
            where: { id: getIdParam(req) },
            data: {
                doctorId: req.body.doctorId,
                name: req.body.name,
                phone: normalizePhone(req.body.phone),
                address: req.body.address,
                historyDate: req.body.historyDate,
            },
            include: { doctor: { select: { unitId: true } } },
        });
        writeAuditLog(req, {
            action: 'updated',
            entityType: 'patient',
            entityId: patient.id,
            summary: `Paciente actualizado: ${patient.name}`,
            unitId: patient.doctor.unitId,
            doctorId: patient.doctorId,
            before: existing,
            after: patient,
        });
        res.json(patient);
    }
    catch {
        res.status(404).json({ error: 'Patient not found' });
    }
}
export async function deletePatient(req, res) {
    const patient = await prisma.patient.findUnique({
        where: { id: getIdParam(req) },
        include: { doctor: { select: { unitId: true, canEditPatients: true } } },
    });
    if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
    }
    if ((req.auth?.role === 'doctor' && req.auth.doctorId !== patient.doctorId) ||
        (req.auth?.role !== 'superadmin' && req.auth?.unitId && req.auth.unitId !== patient.doctor.unitId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    if (req.auth?.role === 'doctor' && !patient.doctor.canEditPatients) {
        res.status(403).json({ error: 'Doctor cannot edit patients' });
        return;
    }
    await prisma.$transaction(async (tx) => {
        await tx.visitEntry.deleteMany({ where: { patientId: patient.id } });
        await tx.appointment.deleteMany({ where: { patientId: patient.id } });
        await tx.patient.delete({ where: { id: patient.id } });
    });
    writeAuditLog(req, {
        action: 'deleted',
        entityType: 'patient',
        entityId: patient.id,
        summary: `Paciente eliminado: ${patient.name}`,
        unitId: patient.doctor.unitId,
        doctorId: patient.doctorId,
        before: patient,
    });
    res.status(204).send();
}
