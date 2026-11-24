import {
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  List,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/authSession";
import { Sidebar } from "../components/layout/Sidebar/Sidebar";
import type { SidebarItem } from "../components/layout/Sidebar/Sidebar";
import { AdminProvider } from "../pages/admin/AdminContext";
import styles from "./Layout.module.css";

const items: readonly SidebarItem[] = [
  { label: "Обзор", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Календарь", to: "/admin/calendar", icon: CalendarDays },
  { label: "Услуги и цены", to: "/admin/services", icon: List },
  { label: "Статистика", to: "/admin/statistics", icon: ChartNoAxesCombined },
];

export function AdminLayout() {
  const user = useAuthSession((state) => state.user);
  const navigate = useNavigate();
  function logout() {
    useAuthSession.getState().logout();
    navigate("/admin/login", { replace: true });
  }
  const { pathname } = useLocation();
  const title = items.find((item) => item.to === pathname)?.label;
  return (
    <div id="admin-cabinet" className={styles.cabinetLayout}>
      <Sidebar
        items={items}
        label="Меню администратора"
        user={user?.name || user?.email || ""}
        onLogout={logout}
        showUser={false}
      />
      <div className={styles.cabinet}>
        <header className={styles.cabinetHeader}>
          <h2>{pathname === "/admin" ? "" : title}</h2>
          <Link to="/admin" className={styles.account}>
            ЛИЧНЫЙ КАБИНЕТ
          </Link>
        </header>
        <AdminProvider key={user?.id}>
          <Outlet />
        </AdminProvider>
      </div>
    </div>
  );
}
