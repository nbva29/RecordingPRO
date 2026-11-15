import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { AuthForm } from '../components/auth/AuthForm'
import type { AuthFormValues } from '../components/auth/AuthForm'

export function RegisterPage() {
  const navigate = useNavigate()
  const [accountCreated, setAccountCreated] = useState(false)
  const createdEmail = useRef<string | null>(null)
  const pendingRequest = useRef<AbortController | null>(null)

  useEffect(() => () => pendingRequest.current?.abort(), [])

  async function handleSubmit(values: AuthFormValues) {
    const controller = new AbortController()
    pendingRequest.current = controller
    try {
      if (createdEmail.current === null) {
        const user = await authApi.register(values, controller.signal)
        createdEmail.current = user.email.trim().toLowerCase()
        setAccountCreated(true)
      }

      try {
        const token = await authApi.login(values, controller.signal)
        await authApi.updateProfile(token.access_token, values, controller.signal)
      } catch (error) {
        if (controller.signal.aborted) throw error
        const reason = error instanceof Error ? error.message : 'Повторите попытку.'
        throw new Error(`Аккаунт создан, но имя и телефон не сохранены. ${reason} Нажмите «Сохранить данные», чтобы повторить.`)
      }

      if (!controller.signal.aborted) {
        navigate('/login', { replace: true, state: { registrationComplete: true, email: createdEmail.current } })
      }
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null
    }
  }

  return <AuthForm mode="register" onSubmit={handleSubmit} registrationCreated={accountCreated} />
}
