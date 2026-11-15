import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { authApi, AuthApiError } from '../api/authApi'
import { AuthForm } from '../components/auth/AuthForm'
import type { AuthFormValues } from '../components/auth/AuthForm'
import type { AuthRole } from '../types/authApi'

export function LoginPage({ audience = 'client' }: { audience?: AuthRole }) {
  return <LoginRequestForm key={audience} audience={audience} />
}

function LoginRequestForm({ audience }: { audience: AuthRole }) {
  const { state } = useLocation()
  const notice = audience === 'client' && state?.registrationComplete === true && typeof state.email === 'string'
  const [successMessage, setSuccessMessage] = useState(notice ? 'Аккаунт создан. Войдите с вашим email и паролем.' : '')
  const pendingRequest = useRef<AbortController | null>(null)

  useEffect(() => () => pendingRequest.current?.abort(), [])

  async function handleSubmit(values: AuthFormValues) {
    const controller = new AbortController()
    pendingRequest.current = controller
    setSuccessMessage('')
    try {
      const token = await authApi.login(values, controller.signal)
      const user = await authApi.getCurrentUser(token.access_token, controller.signal)
      if (user.role.name !== audience) {
        throw new AuthApiError(audience === 'admin'
          ? 'Для входа администратора нужен аккаунт администратора.'
          : 'Это аккаунт администратора. Воспользуйтесь входом администратора.', 403)
      }
      if (!controller.signal.aborted) setSuccessMessage(audience === 'admin' ? 'Вход администратора выполнен.' : 'Вход выполнен.')
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null
    }
  }

  return <AuthForm mode="login" audience={audience} initialEmail={notice ? state.email : undefined}
    onSubmit={handleSubmit} successMessage={successMessage} onValuesChange={() => setSuccessMessage('')} />
}
