import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
export async function listDoctors(_req, res) {
    const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
    res.json(doctors);
}
export async function getDoctor(req, res) {
    const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } });
    if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
    }
    res.json(doctor);
}
export async function createDoctor(req, res) {
    const doctor = await prisma.doctor.create({
        data: {
            name: req.body.name,
            unitId: req.body.unitId,
            specialtyId: req.body.specialtyId ?? null,
            phone: req.body.phone,
            licenseNumber: req.body.licenseNumber,
            canEditPatients: req.body.canEditPatients ?? true,
            canManageVisits: req.body.canManageVisits ?? true,
        },
    });
    res.status(201).json(doctor);
}
export async function updateDoctor(req, res) {
    try {
        const doctor = await prisma.doctor.update({
            where: { id: getIdParam(req) },
            data: {
                name: req.body.name,
                unitId: req.body.unitId,
                specialtyId: req.body.specialtyId ?? null,
                phone: req.body.phone,
                licenseNumber: req.body.licenseNumber,
                canEditPatients: req.body.canEditPatients,
                canManageVisits: req.body.canManageVisits,
            },
        });
        res.json(doctor);
    }
    catch {
        res.status(404).json({ error: 'Doctor not found' });
    }
}
export async function deleteDoctor(req, res) {
    const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } });
    if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
    }
    await prisma.$transaction(async (tx) => {
        await tx.visitEntry.deleteMany({ where: { doctorId: doctor.id } });
        await tx.appointment.deleteMany({ where: { doctorId: doctor.id } });
        await tx.patient.deleteMany({ where: { doctorId: doctor.id } });
        await tx.doctor.delete({ where: { id: doctor.id } });
    });
    res.status(204).send();
}
