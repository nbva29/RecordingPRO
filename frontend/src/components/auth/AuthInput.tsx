import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './AuthForm.module.css'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function AuthInput({ label, error, hint, ...props }: AuthInputProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeading}>
        <label className={styles.label} htmlFor={id}>{label}</label>
        {hint && <span className={styles.hint} id={hintId}>{hint}</span>}
      </div>
      <input {...props} id={id} className={styles.input} aria-invalid={error ? true : undefined} aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined} />
      {error && <p className={styles.fieldError} id={errorId} role="alert">{error}</p>}
    </div>
  )
}
