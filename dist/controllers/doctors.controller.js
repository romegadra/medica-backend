import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { getIdParam } from '../utils/params.js';
import { normalizePhone } from '../utils/phone.js';
export async function listDoctors(req, res) {
    const where = {};
    if (req.auth?.role === 'doctor') {
        where.id = req.auth.doctorId ?? '__none__';
    }
    else if (req.auth?.unitId) {
        where.unitId = req.auth.unitId;
    }
    const doctors = await prisma.doctor.findMany({ where, orderBy: { name: 'asc' } });
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
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : undefined;
    if (!email) {
        res.status(400).json({ error: 'email is required' });
        return;
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const existingDoctor = await prisma.doctor.findFirst({ where: { email } });
    if (existingUser || existingDoctor) {
        res.status(409).json({ error: 'Email is already used' });
        return;
    }
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234';
    const hash = await bcrypt.hash(defaultPassword, 10);
    const doctor = await prisma.$transaction(async (tx) => {
        const created = await tx.doctor.create({
            data: {
                name: req.body.name,
                email,
                unitId: req.body.unitId,
                specialtyId: req.body.specialtyId ?? null,
                phone: normalizePhone(req.body.phone),
                licenseNumber: req.body.licenseNumber,
                profileImageUrl: req.body.profileImageUrl ?? null,
                canEditPatients: req.body.canEditPatients ?? true,
                canManageVisits: req.body.canManageVisits ?? true,
                notificationsEnabled: req.body.notificationsEnabled ?? true,
            },
        });
        await tx.user.create({
            data: {
                email,
                password: hash,
                role: 'doctor',
                doctorId: created.id,
                unitId: created.unitId,
                mustChangePassword: true,
            },
        });
        return created;
    });
    res.status(201).json(doctor);
}
export async function updateDoctor(req, res) {
    try {
        const doctorId = getIdParam(req);
        const existingDoctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        if (!existingDoctor) {
            res.status(404).json({ error: 'Doctor not found' });
            return;
        }
        const nextEmail = typeof req.body.email === 'string' ? req.body.email.trim() : existingDoctor.email;
        if (!nextEmail) {
            res.status(400).json({ error: 'email is required' });
            return;
        }
        if (nextEmail !== existingDoctor.email) {
            const emailUser = await prisma.user.findUnique({ where: { email: nextEmail } });
            const emailDoctor = await prisma.doctor.findFirst({
                where: { email: nextEmail, id: { not: doctorId } },
            });
            if ((emailUser && emailUser.doctorId !== doctorId) || emailDoctor) {
                res.status(409).json({ error: 'Email is already used' });
                return;
            }
        }
        const doctor = await prisma.$transaction(async (tx) => {
            const existing = await tx.doctor.findUnique({ where: { id: doctorId } });
            if (!existing) {
                return null;
            }
            const updated = await tx.doctor.update({
                where: { id: doctorId },
                data: {
                    name: req.body.name,
                    email: nextEmail,
                    unitId: req.body.unitId,
                    specialtyId: req.body.specialtyId ?? null,
                    phone: normalizePhone(req.body.phone),
                    licenseNumber: req.body.licenseNumber,
                    profileImageUrl: req.body.profileImageUrl ?? null,
                    canEditPatients: req.body.canEditPatients,
                    canManageVisits: req.body.canManageVisits,
                    notificationsEnabled: req.body.notificationsEnabled,
                },
            });
            if (nextEmail !== existing.email) {
                if (existing.email) {
                    await tx.user.updateMany({
                        where: { doctorId: doctorId },
                        data: { email: nextEmail, unitId: updated.unitId },
                    });
                }
                else {
                    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234';
                    const hash = await bcrypt.hash(defaultPassword, 10);
                    await tx.user.create({
                        data: {
                            email: nextEmail,
                            password: hash,
                            role: 'doctor',
                            doctorId: doctorId,
                            unitId: updated.unitId,
                            mustChangePassword: true,
                        },
                    });
                }
            }
            else if (req.body.unitId) {
                await tx.user.updateMany({
                    where: { doctorId: doctorId },
                    data: { unitId: updated.unitId },
                });
            }
            return updated;
        });
        if (!doctor) {
            res.status(404).json({ error: 'Doctor not found' });
            return;
        }
        res.json(doctor);
    }
    catch {
        res.status(404).json({ error: 'Doctor not found' });
    }
}
export async function resetDoctorPassword(req, res) {
    const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } });
    if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
    }
    if (!doctor.email) {
        res.status(400).json({ error: 'Doctor does not have an email' });
        return;
    }
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Temp1234';
    const hash = await bcrypt.hash(defaultPassword, 10);
    const user = await prisma.user.findUnique({ where: { email: doctor.email } });
    if (user && user.role !== 'doctor') {
        res.status(409).json({ error: 'Email is already used by another role' });
        return;
    }
    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hash,
                doctorId: doctor.id,
                unitId: doctor.unitId,
                mustChangePassword: true,
            },
        });
    }
    else {
        await prisma.user.create({
            data: {
                email: doctor.email,
                password: hash,
                role: 'doctor',
                doctorId: doctor.id,
                unitId: doctor.unitId,
                mustChangePassword: true,
            },
        });
    }
    res.json({ email: doctor.email, mustChangePassword: true });
}
export async function deleteDoctor(req, res) {
    const doctor = await prisma.doctor.findUnique({ where: { id: getIdParam(req) } });
    if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
    }
    await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { doctorId: doctor.id } });
        await tx.visitEntry.deleteMany({ where: { doctorId: doctor.id } });
        await tx.appointment.deleteMany({ where: { doctorId: doctor.id } });
        await tx.patient.deleteMany({ where: { doctorId: doctor.id } });
        await tx.doctorSchedule.deleteMany({ where: { doctorId: doctor.id } });
        await tx.doctorBlockedTime.deleteMany({ where: { doctorId: doctor.id } });
        await tx.doctor.delete({ where: { id: doctor.id } });
    });
    res.status(204).send();
}
