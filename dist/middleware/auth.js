import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'dev-secret';
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = header.slice('Bearer '.length);
    try {
        const payload = jwt.verify(token, secret);
        req.auth = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
export function requireRole(roles) {
    return (req, res, next) => {
        const auth = req.auth;
        if (!auth || !roles.includes(auth.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
}
