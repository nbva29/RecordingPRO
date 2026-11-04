import { CalendarDays, LayoutDashboard, Search, UserRound } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar/Sidebar";
import type { SidebarItem } from "../components/layout/Sidebar/Sidebar";
import styles from "./Layout.module.css";

const items: readonly SidebarItem[] = [
  { label: "Обзор", to: "/client", icon: LayoutDashboard, end: true },
  { label: "Мои записи", to: "/client/bookings", icon: CalendarDays },
  { label: "Найти услуги", to: "/search", icon: Search },
  { label: "Профиль", to: "/client/profile", icon: UserRound },
];

export function ClientLayout() {
  return (
    <div className={styles.cabinetLayout}>
      <Sidebar items={items} label="Меню клиента" user="Екатерина Иванова" />

      <div className={styles.cabinet}>
        <header className={styles.cabinetHeader}>
          <div className={styles.headerSide} />
          <div className={styles.headerSide}>
            <Link to="/client" className={styles.account}>
              ЛИЧНЫЙ КАБИНЕТ
            </Link>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
