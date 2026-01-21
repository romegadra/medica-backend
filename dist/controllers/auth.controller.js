import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
const secret = process.env.JWT_SECRET || 'dev-secret';
export function login(req, res) {
    void (async () => {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'email and password are required' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jwt.sign({ role: user.role, doctorId: user.doctorId ?? undefined, unitId: user.unitId ?? undefined }, secret, { expiresIn: '7d' });
        res.json({
            token,
            role: user.role,
            doctorId: user.doctorId,
            unitId: user.unitId,
        });
    })();
}
