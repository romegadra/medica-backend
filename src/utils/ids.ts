export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}`
}
