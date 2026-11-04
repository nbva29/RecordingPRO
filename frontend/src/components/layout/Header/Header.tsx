import { Link, useNavigate } from 'react-router-dom'
import logo from '../../../assets/logo.svg'
import { Button } from '../../ui/Button/Button'
import styles from './Header.module.css'

export function Header() {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Link to="/" aria-label="ЗаписьПро — главная страница" className={styles.logoLink}>
          <img src={logo} alt="ЗаписьПро" width={214} height={31} className={styles.logo} />
        </Link>
      </div>
      <nav aria-label="Основная навигация">
        <Link to="/search" className={styles.link}>Найти услугу</Link>
      </nav>
      <div className={styles.actions}>
        <Button className={styles.loginButton} variant="secondary" onClick={() => navigate('/login')}>Войти</Button>
      </div>
    </header>
  )
}
