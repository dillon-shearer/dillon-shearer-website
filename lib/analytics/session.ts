import { createHash } from 'crypto'

export function generateSessionHash(ip: string, userAgent: string): string {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const rawString = `${ip}|${userAgent}|${today}`
  return createHash('sha256').update(rawString).digest('hex').substring(0, 32)
}
