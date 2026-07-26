export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getEmailDomain(email: string): string {
  const normalized = normalizeEmail(email)
  const [, domain] = normalized.split('@')
  return domain ?? ''
}

export function isEmailLike(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
