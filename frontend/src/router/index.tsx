import type { RouteObject } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { ClientLayout } from "../layouts/ClientLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { BookingPage } from "../pages/BookingPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { OrganizationPage } from "../pages/OrganizationPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SearchPage } from "../pages/SearchPage";
import { AdminCalendarPage } from "../pages/admin/AdminCalendarPage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminServicesPage } from "../pages/admin/AdminServicesPage";
import { AdminStatisticsPage } from "../pages/admin/AdminStatisticsPage";
import { ClientBookingsPage } from "../pages/client/ClientBookingsPage";
import { ClientOverviewPage } from "../pages/client/ClientOverviewPage";
import { ClientProfilePage } from "../pages/client/ClientProfilePage";

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "organizations/:id", element: <OrganizationPage /> },
      { path: "booking/:id", element: <BookingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },
  {
    path: "client",
    element: <ClientLayout />,
    children: [
      { index: true, element: <ClientOverviewPage /> },
      { path: "bookings", element: <ClientBookingsPage /> },
      { path: "profile", element: <ClientProfilePage /> },
    ],
  },
  {
    path: "admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: "calendar", element: <AdminCalendarPage /> },
      { path: "services", element: <AdminServicesPage /> },
      { path: "statistics", element: <AdminStatisticsPage /> },
    ],
  },
];
