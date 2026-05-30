export function normalizePhone(phone?: unknown) {
  if (typeof phone !== 'string') return null
  const trimmed = phone.trim()
  if (!trimmed) return null

  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.length === 13 && digits.startsWith('521')) {
    digits = `52${digits.slice(3)}`
  }

  if (digits.length === 13 && (digits.startsWith('044') || digits.startsWith('045'))) {
    digits = digits.slice(3)
  }

  if (digits.length === 12 && digits.startsWith('01')) {
    digits = digits.slice(2)
  }

  if (digits.length === 10) {
    digits = `52${digits}`
  }

  return `+${digits}`
}
