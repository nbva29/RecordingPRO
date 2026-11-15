export interface AuthFormValues {
  email: string
  password: string
  name: string
  phone: string
  passwordConfirmation: string
  termsAccepted: boolean
}

export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>

export interface RecoveryValues {
  email: string
  code: string
  newPassword: string
}

export type RecoveryFieldErrors = Partial<Record<keyof RecoveryValues, string>>

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Введите email.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Введите корректный email, например name@example.com.'
  }
}

export function validatePassword(value: string, minimum = 8): string | undefined {
  if (!value) return 'Введите пароль.'
  if (value.length < minimum) return `Пароль должен содержать минимум ${minimum} символов.`
  if (value.length > 128) return 'Пароль должен содержать не больше 128 символов.'
}

export function readAuthForm(form: HTMLFormElement): AuthFormValues {
  const data = new FormData(form)
  const value = (key: string) => String(data.get(key) ?? '')
  return {
    email: value('email').trim().toLowerCase(),
    password: value('password'),
    name: value('name').trim(),
    phone: value('phone').trim(),
    passwordConfirmation: value('passwordConfirmation'),
    termsAccepted: data.get('termsAccepted') === 'on',
  }
}

export function validateAuthForm(values: AuthFormValues, mode: 'login' | 'register'): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  if (mode === 'register') {
    if (!values.name.trim()) errors.name = 'Введите имя.'
    else if (values.name.length > 100) errors.name = 'Имя должно содержать не больше 100 символов.'
  }
  errors.email = validateEmail(values.email)
  if (mode === 'register') {
    const digits = values.phone.replace(/\D/g, '')
    if (!values.phone.trim()) errors.phone = 'Введите телефон.'
    else if (values.phone.length > 32 || !/^\+?[\d\s().-]+$/.test(values.phone) || digits.length < 10 || digits.length > 15) {
      errors.phone = 'Введите телефон из 10–15 цифр. Можно использовать +, пробелы, скобки и дефисы.'
    }
  }
  errors.password = validatePassword(values.password, mode === 'register' ? 8 : 1)
  if (mode === 'register') {
    if (!values.passwordConfirmation) errors.passwordConfirmation = 'Повторите пароль.'
    else if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = 'Пароли не совпадают.'
    if (!values.termsAccepted) errors.termsAccepted = 'Подтвердите согласие с условиями и политикой конфиденциальности.'
  }
  return errors
}

export function validateRecovery(values: RecoveryValues): RecoveryFieldErrors {
  return {
    email: validateEmail(values.email),
    code: !values.code ? 'Введите код из письма.' : !/^[0-9]{6}$/.test(values.code) ? 'Код должен состоять из 6 цифр.' : undefined,
    newPassword: validatePassword(values.newPassword),
  }
}

export function firstInvalidField<T extends string>(errors: Partial<Record<T, string>>): T | undefined {
  return (Object.keys(errors) as T[]).find(key => Boolean(errors[key]))
}
