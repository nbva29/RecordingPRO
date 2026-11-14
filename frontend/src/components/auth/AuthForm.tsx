import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button/Button'
import { AuthInput } from './AuthInput'
import styles from './AuthForm.module.css'

export interface AuthFormValues {
  email: string
  password: string
  name: string
  phone: string
  passwordConfirmation: string
  termsAccepted: boolean
}

interface AuthFormProps {
  mode: 'login' | 'register'
  audience?: 'client' | 'admin'
  onSubmit?: (values: AuthFormValues) => void | Promise<void>
  onForgotPassword?: () => void
  isSubmitting?: boolean
  errorMessage?: string
}

export function AuthForm({ mode, audience = 'client', onSubmit, onForgotPassword, isSubmitting = false, errorMessage }: AuthFormProps) {
  const register = mode === 'register'
  const titleId = useId()
  const errorId = useId()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submissionInProgress = useRef(false)
  const busy = submitting || isSubmitting
  const feedback = errorMessage || submitError
  const busyLabel = register ? 'Создаём аккаунт…' : 'Входим…'
  const unavailableMessage = register
    ? 'Не удалось создать аккаунт. Попробуйте позже.'
    : 'Не удалось войти. Попробуйте позже.'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || submissionInProgress.current) return

    setSubmitError('')
    // S1 provides the forms. S3 will supply the real API submission callback.
    if (!onSubmit) {
      setSubmitError(unavailableMessage)
      return
    }

    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '')
    const values: AuthFormValues = {
      email: value('email').trim().toLowerCase(),
      password: value('password'),
      name: value('name').trim(),
      phone: value('phone').trim(),
      passwordConfirmation: value('passwordConfirmation'),
      termsAccepted: form.get('termsAccepted') === 'on',
    }

    submissionInProgress.current = true
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (cause) {
      setSubmitError(cause instanceof Error && cause.message ? cause.message : unavailableMessage)
    } finally {
      submissionInProgress.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className={[styles.root, register ? styles.registration : audience === 'admin' ? styles.admin : styles.client].join(' ')} data-auth-page data-auth-audience={register ? 'client' : audience} aria-labelledby={titleId}>
      <h1 className={styles.title} id={titleId}>{register ? 'Регистрация' : 'Вход в аккаунт'}</h1>
      <p className={styles.subtitle}>{register ? 'Создайте новый аккаунт' : 'Введите email и пароль'}</p>

      <form onSubmit={handleSubmit} onChange={() => setSubmitError('')} aria-busy={busy} aria-describedby={feedback ? errorId : undefined}>
        <fieldset className={styles.fields} disabled={busy}>
          <div className={styles.inputs}>
          {register && <AuthInput label="Имя" name="name" autoComplete="name" placeholder="Как вас зовут?" maxLength={100} required />}
          <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required />
          {register && <AuthInput label="Телефон" name="phone" type="tel" autoComplete="tel" placeholder="+7 (999) 123-45-67" maxLength={32} required />}
          <AuthInput label="Пароль" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Минимум 8 символов' : 'Введите пароль'} minLength={register ? 8 : 1} maxLength={128} required />
          {register && <AuthInput label="Подтверждение пароля" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Повторите пароль" minLength={8} maxLength={128} required />}
          </div>
          {register && (
            <label className={styles.consent}>
              <input name="termsAccepted" type="checkbox" required />
              <span>Я принимаю условия использования <span className={styles.policy}>и политику конфиденциальности</span></span>
            </label>
          )}
          <div className={register ? styles.registrationFeedback : styles.loginFeedback}>
            {feedback && <p className={styles.error} id={errorId} role="alert">{feedback}</p>}
          </div>
          {!register && <button className={styles.recovery} type="button" disabled={busy} onClick={() => {
            setSubmitError('')
            if (onForgotPassword) onForgotPassword()
            else setSubmitError('Восстановление пароля пока недоступно. Попробуйте позже.')
          }}>Забыли пароль?</button>}
          <Button className={styles.submit} type="submit" disabled={busy}>
            {busy ? busyLabel : <>{register ? 'Зарегистрироваться' : 'Войти'} <span aria-hidden="true">→</span></>}
          </Button>
        </fieldset>
        {busy && <p className={styles.srOnly} role="status">{busyLabel}</p>}
      </form>

      {(register || audience === 'client') && <p className={styles.footer}>
        <span>{register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}</span>
        <Link to={register ? '/login' : '/register'}>{register ? 'Войти' : 'Зарегистрироваться'}</Link>
      </p>}
      {!register && audience === 'client' && <Link className={styles.adminLink} to="/admin/login">Войти как администратор</Link>}
    </section>
  )
}
