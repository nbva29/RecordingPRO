import {
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  List,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar/Sidebar";
import type { SidebarItem } from "../components/layout/Sidebar/Sidebar";
import styles from "./Layout.module.css";

const items: readonly SidebarItem[] = [
  { label: "Обзор", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Календарь", to: "/admin/calendar", icon: CalendarDays },
  { label: "Услуги и цены", to: "/admin/services", icon: List },
  { label: "Статистика", to: "/admin/statistics", icon: ChartNoAxesCombined },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const title = items.find((item) => item.to === pathname)?.label;
  return (
    <div className={styles.cabinetLayout}>
      <Sidebar items={items} label="Меню администратора" user="Анна Смирнова" />
      <div className={styles.cabinet}>
        <header className={styles.cabinetHeader}>
          <h2>{pathname === "/admin" ? "" : title}</h2>
          <Link to="/admin" className={styles.account}>
            ЛИЧНЫЙ КАБИНЕТ
          </Link>
        </header>
      </div>
    </div>
  );
}
