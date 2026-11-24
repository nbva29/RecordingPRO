import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../../../assets/logo.svg";
import styles from "./Sidebar.module.css";
import { Button } from "../../ui/Button/Button";

export interface SidebarItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

interface SidebarProps {
  items: readonly SidebarItem[];
  label: string;
  user: string;
  onLogout?: () => void;
  showUser?: boolean;
}

export function Sidebar({
  items,
  label,
  user,
  onLogout,
  showUser = true,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <NavLink to="/" className={styles.brand} aria-label="ЗаписьПро — главная">
        <img src={logo} alt="ЗаписьПро" width={214} height={31} />
      </NavLink>
      <nav aria-label={label}>
        <ul className={styles.menu}>
          {items.map(({ label: itemLabel, to, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [styles.link, isActive && styles.active]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <span>{itemLabel}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {showUser && <div className={styles.user}>● {user}</div>}
      {onLogout && (
        <Button
          variant="secondary"
          className={styles.logout}
          onClick={onLogout}
        >
          Выйти
        </Button>
      )}
    </aside>
  );
}
