import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './AuthForm.module.css'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function AuthInput({ label, ...props }: AuthInputProps) {
  const id = useId()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input {...props} id={id} className={styles.input} />
    </div>
  )
}
