import axios, { AxiosHeaders } from 'axios'
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { getSessionToken, invalidateSession } from './authSession'

function isOwnApi(config: AxiosRequestConfig): boolean {
  if (typeof window === 'undefined') return false
  try {
    const target = new URL(axios.getUri(config), window.location.origin)
    return target.origin === window.location.origin && target.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

export function attachSessionToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!isOwnApi(config)) return config
  const token = getSessionToken()
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`)
  return config
}

export function handleUnauthorized(error: AxiosError) {
  if (error.response?.status !== 401 || !error.config || !isOwnApi(error.config)) return
  const header = AxiosHeaders.from(error.config.headers).get('Authorization')
  if (typeof header === 'string' && header.startsWith('Bearer ')) invalidateSession(header.slice(7))
}
