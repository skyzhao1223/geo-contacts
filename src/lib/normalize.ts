export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('86') && digits.length === 13) {
    return digits.slice(2)
  }
  return digits
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  if (!na || !nb) return false
  if (na === nb) return true
  return na.endsWith(nb) || nb.endsWith(na)
}
