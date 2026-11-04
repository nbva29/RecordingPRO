import { Outlet } from 'react-router-dom'
import { Header } from '../components/layout/Header/Header'
import styles from './Layout.module.css'

export function PublicLayout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
