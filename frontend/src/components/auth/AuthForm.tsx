import { useId, useRef, useState } from 'react'
import type { FormEvent, FocusEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button/Button'
import { AuthInput } from './AuthInput'
import { PasswordRecoveryDialog } from './PasswordRecoveryDialog'
import { firstInvalidField, readAuthForm, validateAuthForm } from './authValidation'
import type { AuthFieldErrors, AuthFormValues } from './authValidation'
import styles from './AuthForm.module.css'

export type { AuthFormValues } from './authValidation'

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
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const checkedFields = useRef(new Set<keyof AuthFormValues>())
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
    const values = readAuthForm(event.currentTarget)
    const errors = validateAuthForm(values, mode)
    checkedFields.current = new Set(Object.keys(values) as (keyof AuthFormValues)[])
    setFieldErrors(errors)
    const invalidField = firstInvalidField(errors)
    if (invalidField) {
      const input = event.currentTarget.elements.namedItem(invalidField)
      if (input instanceof HTMLElement) input.focus()
      return
    }

    // S3 will supply the real API submission callback.
    if (!onSubmit) {
      setSubmitError(unavailableMessage)
      return
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

  function checkField(event: FocusEvent<HTMLFormElement>) {
    if (busy || submissionInProgress.current) return
    if (!(event.target instanceof HTMLInputElement)) return
    const field = event.target.name as keyof AuthFormValues
    checkedFields.current.add(field)
    const errors = validateAuthForm(readAuthForm(event.currentTarget), mode)
    setFieldErrors(current => ({ ...current, [field]: errors[field] }))
  }

  function handleChange(event: FormEvent<HTMLFormElement>) {
    setSubmitError('')
    if (!(event.target instanceof HTMLInputElement)) return
    const field = event.target.name as keyof AuthFormValues
    const errors = validateAuthForm(readAuthForm(event.currentTarget), mode)
    setFieldErrors(current => ({
      ...current,
      ...(checkedFields.current.has(field) ? { [field]: errors[field] } : {}),
      ...(field === 'password' && checkedFields.current.has('passwordConfirmation')
        ? { passwordConfirmation: errors.passwordConfirmation } : {}),
    }))
  }

  return (
    <>
    <section className={[styles.card, register ? styles.registration : audience === 'admin' ? styles.admin : styles.client].join(' ')} data-auth-page data-auth-audience={register ? 'client' : audience} aria-labelledby={titleId}>
      <h1 className={styles.title} id={titleId}>{register ? 'Регистрация' : 'Вход в аккаунт'}</h1>
      <p className={styles.subtitle}>{register ? 'Создайте новый аккаунт' : 'Введите email и пароль'}</p>

      <form noValidate onSubmit={handleSubmit} onBlur={checkField} onChange={handleChange} aria-busy={busy} aria-describedby={feedback ? errorId : undefined}>
        <fieldset className={styles.fields} disabled={busy}>
          <div className={styles.inputs}>
          {register && <AuthInput label="Имя" name="name" autoComplete="name" placeholder="Как вас зовут?" maxLength={100} required error={fieldErrors.name} />}
          <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required error={fieldErrors.email} />
          {register && <AuthInput label="Телефон" name="phone" type="tel" autoComplete="tel" placeholder="+7 (999) 123-45-67" maxLength={32} required error={fieldErrors.phone} hint="10–15 цифр" />}
          <AuthInput label="Пароль" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Минимум 8 символов' : 'Введите пароль'} minLength={register ? 8 : 1} maxLength={128} required error={fieldErrors.password} hint={register ? '8–128 символов' : undefined} />
          {register && <AuthInput label="Подтверждение пароля" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Повторите пароль" minLength={8} maxLength={128} required error={fieldErrors.passwordConfirmation} />}
          </div>
          {register && (
            <label className={styles.consent}>
              <input name="termsAccepted" type="checkbox" required aria-invalid={fieldErrors.termsAccepted ? true : undefined} aria-describedby={fieldErrors.termsAccepted ? `${errorId}-terms` : undefined} />
              <span>Я принимаю условия использования <span className={styles.policy}>и политику конфиденциальности</span></span>
            </label>
          )}
          {register && fieldErrors.termsAccepted && <p className={[styles.fieldError, styles.termsError].join(' ')} id={`${errorId}-terms`} role="alert">{fieldErrors.termsAccepted}</p>}
          <div className={register ? styles.registrationFeedback : styles.loginFeedback}>
            {feedback && <p className={styles.error} id={errorId} role="alert">{feedback}</p>}
          </div>
          {!register && <button className={styles.recovery} type="button" disabled={busy} onClick={() => {
            setSubmitError('')
            if (onForgotPassword) onForgotPassword()
            else setRecoveryOpen(true)
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
    {recoveryOpen && !register && <PasswordRecoveryDialog onClose={() => setRecoveryOpen(false)} />}
    </>
  )
}
