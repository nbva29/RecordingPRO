import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '../components/layout/Header/Header'
import styles from './AuthLayout.module.css'

export function AuthLayout() {
  const pathname = useLocation().pathname.replace(/\/+$/, '')
  const screen = pathname === '/register' ? styles.registration
    : pathname === '/admin/login' ? styles.admin : styles.client

  return (
    <div className={styles.shell} data-auth-layout>
      <Header variant="auth" />
      <main className={[styles.main, screen].join(' ')}>
        <Outlet />
      </main>
    </div>
  )
}
