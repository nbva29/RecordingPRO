import { create } from 'zustand'
import type { AuthTokenDto, AuthUserDto } from '../types/authApi'

const storageKey = 'recordingpro.auth'
type Status = 'anonymous' | 'checking' | 'authenticated' | 'restore-error'
type EndReason = 'logout' | 'expired' | 'unauthorized' | null
interface StoredSession { accessToken: string; expiresAt: number }

function saveStoredSession(session: StoredSession | null) {
  try {
    if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
    else sessionStorage.removeItem(storageKey)
  } catch {
    // Storage may be disabled by the browser; the current in-memory session still works.
  }
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value === 'object' && value !== null && 'accessToken' in value && 'expiresAt' in value
      && typeof value.accessToken === 'string' && value.accessToken.trim().length > 0
      && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now()) {
      return { accessToken: value.accessToken, expiresAt: value.expiresAt }
    }
  } catch {
    // A malformed or inaccessible saved session must not prevent the app from opening.
  }
  saveStoredSession(null)
  return null
}

interface AuthSession {
  accessToken: string | null
  expiresAt: number | null
  user: AuthUserDto | null
  status: Status
  endReason: EndReason
  restoreError: string
  restoreAttempt: number
  startSession: (token: AuthTokenDto, user: AuthUserDto) => void
  restoreUser: (token: string, user: AuthUserDto) => void
  failRestore: (token: string, message: string) => void
  retryRestore: () => void
  logout: (reason?: EndReason) => void
}

const saved = readStoredSession()

export const useAuthSession = create<AuthSession>((set, get) => ({
  accessToken: saved?.accessToken ?? null,
  expiresAt: saved?.expiresAt ?? null,
  user: null,
  status: saved ? 'checking' : 'anonymous',
  endReason: null,
  restoreError: '',
  restoreAttempt: 0,

  startSession(token, user) {
    const expiresAt = Date.now() + token.expires_in * 1000
    if (!Number.isFinite(expiresAt)) throw new Error('Сервер вернул некорректный срок действия входа.')
    saveStoredSession({ accessToken: token.access_token, expiresAt })
    set({ accessToken: token.access_token, expiresAt, user, status: 'authenticated', endReason: null, restoreError: '' })
  },

  restoreUser(token, user) {
    if (get().accessToken === token && get().status === 'checking') set({ user, status: 'authenticated', restoreError: '' })
  },

  failRestore(token, message) {
    if (get().accessToken === token && get().status === 'checking') set({ status: 'restore-error', restoreError: message })
  },

  retryRestore() {
    if (get().accessToken) set({ status: 'checking', restoreError: '', restoreAttempt: get().restoreAttempt + 1 })
  },

  logout(reason = 'logout') {
    saveStoredSession(null)
    set({ accessToken: null, expiresAt: null, user: null, status: 'anonymous', endReason: reason, restoreError: '' })
  },
}))

export function getSessionToken(): string | null {
  const state = useAuthSession.getState()
  if (state.accessToken && (!state.expiresAt || state.expiresAt <= Date.now())) {
    state.logout('expired')
    return null
  }
  return state.accessToken
}

export function invalidateSession(token: string, reason: EndReason = 'unauthorized') {
  const state = useAuthSession.getState()
  if (state.accessToken === token) state.logout(reason)
}
