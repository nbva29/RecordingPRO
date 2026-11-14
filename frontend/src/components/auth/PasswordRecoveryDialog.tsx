import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Button } from '../ui/Button/Button'
import { AuthInput } from './AuthInput'
import { firstInvalidField, validateEmail, validateRecovery } from './authValidation'
import type { RecoveryFieldErrors, RecoveryValues } from './authValidation'
import styles from './PasswordRecoveryDialog.module.css'

interface PasswordRecoveryDialogProps {
  onClose: () => void
  onRequestCode?: (email: string) => void | Promise<void>
  onConfirm?: (values: RecoveryValues) => void | Promise<void>
}

const emptyValues: RecoveryValues = { email: '', code: '', newPassword: '' }

export function PasswordRecoveryDialog({ onClose, onRequestCode, onConfirm }: PasswordRecoveryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const pendingRef = useRef(false)
  const titleId = useId()
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState<RecoveryFieldErrors>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<'code' | 'confirm' | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current!
    const opener = document.activeElement
    dialog.showModal()
    const email = formRef.current?.elements.namedItem('email')
    if (email instanceof HTMLInputElement) email.focus()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function changeField(field: keyof RecoveryValues, value: string) {
    const next = field === 'email' ? { ...values, email: value, code: '' } : { ...values, [field]: value }
    setValues(next)
    setError('')
    if (field === 'email') setMessage('')
    setErrors(current => ({
      ...current,
      [field]: field in current ? validateRecovery(next)[field] : undefined,
      ...(field === 'email' ? { code: undefined } : {}),
    }))
  }

  function checkField(field: keyof RecoveryValues) {
    if (!dialogRef.current?.open) return
    setErrors(current => ({ ...current, [field]: validateRecovery(values)[field] }))
  }

  function focusField(field: keyof RecoveryValues) {
    const element = formRef.current?.elements.namedItem(field)
    if (element instanceof HTMLElement) element.focus()
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:enabled, input:enabled')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  async function requestCode() {
    if (pendingRef.current || success) return
    const emailError = validateEmail(values.email)
    setErrors(current => ({ ...current, email: emailError }))
    setError('')
    setMessage('')
    if (emailError) {
      focusField('email')
      return
    }
    if (!onRequestCode) {
      setError('Не удалось отправить код. Попробуйте позже.')
      return
    }
    pendingRef.current = true
    setPending('code')
    try {
      await onRequestCode(values.email.trim().toLowerCase())
      setValues(current => ({ ...current, code: '' }))
      setErrors(current => ({ ...current, code: undefined }))
      setMessage('Если email зарегистрирован, на него отправлен код восстановления.')
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось отправить код. Попробуйте позже.')
    } finally {
      pendingRef.current = false
      setPending(null)
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current || success) return
    const nextErrors = validateRecovery(values)
    setErrors(nextErrors)
    setError('')
    const invalidField = firstInvalidField(nextErrors)
    if (invalidField) {
      focusField(invalidField)
      return
    }
    if (!onConfirm) {
      setError('Не удалось восстановить пароль. Попробуйте позже.')
      return
    }
    pendingRef.current = true
    setPending('confirm')
    try {
      await onConfirm({ ...values, email: values.email.trim().toLowerCase() })
      setSuccess(true)
      setValues(emptyValues)
      setMessage('')
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось восстановить пароль. Попробуйте позже.')
    } finally {
      pendingRef.current = false
      setPending(null)
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onKeyDown={keepFocusInside} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
      <button className={styles.close} type="button" aria-label="Закрыть восстановление пароля" onClick={onClose}>×</button>
      <h2 className={styles.title} id={titleId}>Восстановление пароля</h2>
      <form ref={formRef} noValidate onSubmit={confirm} aria-busy={pending !== null}>
        <fieldset className={styles.fields} disabled={pending !== null || success}>
          <div>
            <AuthInput label="Введите почту" name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} required value={values.email} error={errors.email} onChange={event => changeField('email', event.target.value)} onBlur={() => checkField('email')} />
            <button className={styles.sendCode} type="button" onClick={requestCode}>{pending === 'code' ? 'Отправляем код…' : 'Отправить код'}</button>
          </div>
          <AuthInput label="Введите код" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Введите код" maxLength={6} required hint="6 цифр из письма" value={values.code} error={errors.code} onChange={event => changeField('code', event.target.value)} onBlur={() => checkField('code')} />
          <AuthInput label="Введите новый пароль" name="newPassword" type="password" autoComplete="new-password" placeholder="Введите новый пароль" minLength={8} maxLength={128} required hint="8–128 символов" value={values.newPassword} error={errors.newPassword} onChange={event => changeField('newPassword', event.target.value)} onBlur={() => checkField('newPassword')} />
          <Button type="submit" className={styles.confirm}>{pending === 'confirm' ? 'Подтверждаем…' : 'Подтвердить'}</Button>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.message} role="status">{message}</p>}
        {success && <p className={styles.success} role="status">Пароль восстановлен!</p>}
        {pending && <p className={styles.message} role="status">{pending === 'code' ? 'Отправляем код…' : 'Подтверждаем новый пароль…'}</p>}
      </form>
    </dialog>
  )
}
