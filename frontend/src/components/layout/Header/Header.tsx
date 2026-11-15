import { Link, useNavigate } from 'react-router-dom'
import logo from '../../../assets/logo.svg'
import { Button } from '../../ui/Button/Button'
import styles from './Header.module.css'
import { useAuthSession } from '../../../auth/authSession'
import { homeForRole } from '../../../auth/navigation'

export function Header({ variant = 'public' }: { variant?: 'public' | 'auth' }) {
  const navigate = useNavigate()
  const user = useAuthSession(state => state.user)
  const status = useAuthSession(state => state.status)
  function logout() {
    const login = user?.role.name === 'admin' ? '/admin/login' : '/login'
    useAuthSession.getState().logout()
    navigate(login, { replace: true })
  }

  return (
    <header className={[styles.header, variant === 'auth' && styles.authHeader].filter(Boolean).join(' ')}>
      <div className={styles.brand}>
        <Link to="/" aria-label="ЗаписьПро — главная страница" className={styles.logoLink}>
          <img src={logo} alt="ЗаписьПро" width={214} height={31} className={styles.logo} />
        </Link>
      </div>
      {variant === 'public' && <nav aria-label="Основная навигация">
        <Link to="/search" className={styles.link}>Найти услугу</Link>
      </nav>}
      <div className={styles.actions}>
        {status === 'authenticated' && user ? <>
          <Button className={styles.loginButton} variant="secondary" onClick={() => navigate(homeForRole(user.role.name))}>Личный кабинет</Button>
          <Button className={styles.logoutButton} variant="secondary" onClick={logout}>Выйти</Button>
        </> : <Button className={styles.loginButton} variant="secondary" disabled={status === 'checking'} onClick={() => navigate('/login')}>{status === 'checking' ? 'Проверяем вход…' : 'Войти'}</Button>}
      </div>
    </header>
  )
}
