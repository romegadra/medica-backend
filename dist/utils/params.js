export function getIdParam(req) {
    const value = req.params.id;
    return Array.isArray(value) ? value[0] : value;
}
