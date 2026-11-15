import axios from 'axios'
import type { AxiosResponse } from 'axios'
import type { AuthCredentials, AuthProfileInput, AuthTokenDto, AuthUserDto } from '../types/authApi'

// A separate instance keeps authentication errors and Bearer headers out of catalog requests.
const client = axios.create({ baseURL: '/api/auth', timeout: 15000 })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isToken(value: unknown): value is AuthTokenDto {
  return isRecord(value)
    && typeof value.access_token === 'string' && value.access_token.trim().length > 0
    && value.token_type === 'bearer'
    && typeof value.expires_in === 'number' && Number.isInteger(value.expires_in) && value.expires_in > 0
}

function isUser(value: unknown): value is AuthUserDto {
  return isRecord(value) && isRecord(value.role)
    && typeof value.id === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id)
    && typeof value.email === 'string' && value.email.trim().length > 0
    && (value.name === null || typeof value.name === 'string')
    && (value.phone === null || typeof value.phone === 'string')
    && typeof value.role.id === 'number' && Number.isInteger(value.role.id) && value.role.id > 0
    && (value.role.name === 'client' || value.role.name === 'admin')
}

type Operation = 'register' | 'login' | 'user' | 'profile'

export class AuthApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

function validationMessage(data: unknown, operation: Operation): string {
  const labels: Record<string, string> = { email: 'Email', password: 'Пароль', name: 'Имя', phone: 'Телефон' }
  if (typeof data === 'object' && data !== null && 'detail' in data && Array.isArray(data.detail)) {
    const fields = data.detail.flatMap((detail: unknown) => {
      if (typeof detail !== 'object' || detail === null || !('loc' in detail) || !Array.isArray(detail.loc)) return []
      const field: unknown = detail.loc[detail.loc.length - 1]
      return typeof field === 'string' && Object.hasOwn(labels, field) ? [labels[field]] : []
    })
    if (fields.length) return `Проверьте поля: ${[...new Set(fields)].join(', ')}.`
  }
  return operation === 'profile' ? 'Проверьте имя и телефон.' : 'Проверьте email и пароль.'
}

function toAuthError(error: unknown, operation: Operation): unknown {
  if (axios.isCancel(error) || error instanceof AuthApiError) return error
  if (!axios.isAxiosError(error)) return new AuthApiError('Не удалось выполнить запрос. Повторите попытку.')

  const status = error.response?.status
  if (status === 401) return new AuthApiError(operation === 'login'
    ? 'Неверный email или пароль.' : 'Не удалось подтвердить вход. Попробуйте ещё раз.', status)
  if (status === 403) return new AuthApiError('Недостаточно прав для выполнения действия.', status)
  if (status === 409 && operation === 'register') return new AuthApiError('Пользователь с таким email уже зарегистрирован.', status)
  if (status === 422) return new AuthApiError(validationMessage(error.response?.data, operation), status)
  if (status === 429) return new AuthApiError('Слишком много попыток. Попробуйте позже.', status)
  if (status && status >= 500) return new AuthApiError('Сервис временно недоступен. Попробуйте позже.', status)
  if (status) return new AuthApiError('Не удалось выполнить запрос. Повторите попытку.', status)
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return new AuthApiError('Сервер не ответил вовремя. Повторите попытку.')
  return new AuthApiError('Не удалось связаться с сервером. Проверьте соединение и повторите попытку.')
}

async function request<T>(operation: Operation, send: () => Promise<AxiosResponse<unknown>>, isValid: (value: unknown) => value is T): Promise<T> {
  try {
    const response = await send()
    if (!isValid(response.data)) throw new AuthApiError('Сервер вернул некорректный ответ. Повторите попытку.')
    return response.data
  } catch (error) {
    throw toAuthError(error, operation)
  }
}

function credentialsBody(values: AuthCredentials): AuthCredentials {
  return { email: values.email.trim().toLowerCase(), password: values.password }
}

export const authApi = {
  register(values: AuthCredentials, signal?: AbortSignal): Promise<AuthUserDto> {
    return request('register', () => client.post('/register', credentialsBody(values), { signal }), isUser)
  },

  login(values: AuthCredentials, signal?: AbortSignal): Promise<AuthTokenDto> {
    return request('login', () => client.post('/login', credentialsBody(values), { signal }), isToken)
  },

  getCurrentUser(token: string, signal?: AbortSignal): Promise<AuthUserDto> {
    return request('user', () => client.get('/me', { headers: { Authorization: `Bearer ${token}` }, signal }), isUser)
  },

  updateProfile(token: string, values: AuthProfileInput, signal?: AbortSignal): Promise<AuthUserDto> {
    const body = { name: values.name.trim(), phone: values.phone.trim() }
    return request('profile', () => client.patch('/me', body, { headers: { Authorization: `Bearer ${token}` }, signal }), isUser)
  },
}
