import { AuthForm } from '../components/auth/AuthForm'

export function LoginPage({ audience = 'client' }: { audience?: 'client' | 'admin' }) {
  return <AuthForm key={audience} mode="login" audience={audience} />
}
