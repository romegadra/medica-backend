import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'dev-secret';
export function login(req, res) {
    const { role, doctorId, unitId } = req.body;
    if (!role) {
        res.status(400).json({ error: 'role is required' });
        return;
    }
    const token = jwt.sign({ role, doctorId, unitId }, secret, { expiresIn: '7d' });
    res.json({ token, role, doctorId, unitId });
}
