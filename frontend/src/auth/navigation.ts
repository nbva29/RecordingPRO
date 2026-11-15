import type { AuthRole } from '../types/authApi'

export function homeForRole(role: AuthRole): string {
  return role === 'admin' ? '/admin' : '/client'
}

export function safeReturnTo(role: AuthRole, value: unknown): string {
  const home = homeForRole(role)
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return home
  try {
    const url = new URL(value, 'https://recordingpro.invalid')
    if (url.origin !== 'https://recordingpro.invalid') return home
    if ((url.pathname === home || url.pathname.startsWith(home + '/')) && url.pathname !== '/admin/login') {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // Untrusted or malformed navigation state falls back to the user's own cabinet.
  }
  return home
}
