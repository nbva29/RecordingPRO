import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSession } from '../../auth/authSession'
import { homeForRole, safeReturnTo } from '../../auth/navigation'
import type { AuthRole } from '../../types/authApi'
import { Button } from '../ui/Button/Button'
import styles from './AuthGate.module.css'

function SessionStatus() {
  const status = useAuthSession(state => state.status)
  const error = useAuthSession(state => state.restoreError)
  if (status === 'checking') return <p className={styles.status} role="status">Проверяем вход…</p>
  return <section className={styles.status}>
    <p role="alert">{error || 'Не удалось проверить вход.'}</p>
    <div className={styles.actions}>
      <Button onClick={() => useAuthSession.getState().retryRestore()}>Повторить</Button>
      <Button variant="secondary" onClick={() => useAuthSession.getState().logout()}>Войти заново</Button>
    </div>
  </section>
}

export function RequireAuth({ role }: { role: AuthRole }) {
  const state = useAuthSession()
  const location = useLocation()
  if (state.status === 'checking' || state.status === 'restore-error') return <SessionStatus />
  if (!state.user || state.status !== 'authenticated' || !state.expiresAt) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{
      from: location.pathname + location.search + location.hash,
      sessionEnded: state.endReason === 'expired' || state.endReason === 'unauthorized',
    }} />
  }
  if (state.user.role.name !== role) return <Navigate to={homeForRole(state.user.role.name)} replace />
  return <Outlet />
}

export function GuestOnly() {
  const location = useLocation()
  const status = useAuthSession(state => state.status)
  const user = useAuthSession(state => state.user)
  if (status === 'checking' || status === 'restore-error') return <SessionStatus />
  if (status === 'authenticated' && user) return <Navigate to={safeReturnTo(user.role.name, location.state?.from)} replace />
  return <Outlet />
}
