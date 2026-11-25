import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { routes } = await server.ssrLoadModule("/src/router/index.tsx");
  const { useAuthSession } = await server.ssrLoadModule(
    "/src/auth/authSession.ts",
  );
  const { loadAdminDemo } = await server.ssrLoadModule(
    "/src/pages/admin/adminData.ts",
  );
  const { ServiceDialog } = await server.ssrLoadModule(
    "/src/pages/admin/ServiceDialog.tsx",
  );
  const { PriceDialog } = await server.ssrLoadModule(
    "/src/pages/admin/PriceDialog.tsx",
  );
  const { ServiceCard } = await server.ssrLoadModule(
    "/src/pages/admin/ServiceCard.tsx",
  );
  const { AppointmentDialog } = await server.ssrLoadModule(
    "/src/pages/admin/AppointmentDialog.tsx",
  );
  const { BookingCalendar } = await server.ssrLoadModule(
    "/src/pages/booking/BookingCalendar.tsx",
  );
  const { AdminWeekCalendar } = await server.ssrLoadModule(
    "/src/pages/admin/AdminWeekCalendar.tsx",
  );
  const user = {
    id: "test-admin",
    name: "Анна",
    email: "admin@example.com",
    phone: null,
    organization_id: 1,
    role: { id: 2, name: "admin" },
  };
  const session = {
    user,
    status: "authenticated",
    accessToken: "test-token",
    expiresAt: Date.now() + 60000,
  };
  useAuthSession.setState(session);
  Object.assign(useAuthSession.getInitialState(), session);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const demo = await loadAdminDemo();
  const { localDate } = await server.ssrLoadModule(
    "/src/pages/booking/bookingState.ts",
  );
  const today = new Date(),
    from = localDate(today),
    until = new Date(today);
  until.setDate(until.getDate() + 7);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const counts = {
    total: 0,
    created: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0,
    history: 0,
  };
  const statistics = {
    counts,
    date_from: from,
    date_to: from,
    daily: [],
    popular_services: [],
    percentages: { total_change: 0, completed: 0, cancelled: 0 },
  };
  client.setQueryData(["admin-services", user.id, 1], demo);
  client.setQueryData(["admin-overview", 1, from, localDate(until)], {
    appointments: [],
    statistics,
  });
  client.setQueryData(
    ["admin-calendar", 1, localDate(monday), localDate(sunday)],
    [],
  );
  client.setQueryData(["admin-calendar-today", 1, from], []);
  client.setQueryData(["admin-statistics", 1, 30], statistics);
  for (const [path, expected] of [
    ["/admin", "Ближайшие записи"],
    ["/admin/calendar", "Запись клиентов"],
    ["/admin/services", "Добавить услугу"],
    ["/admin/statistics", "Аналитика записей"],
  ]) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client },
        createElement(RouterProvider, { router }),
      ),
    );
    assert.ok(html.includes(expected), `${path}: ${expected}`);
    assert.ok(
      html.includes('href="/admin/calendar"'),
      `${path}: calendar link`,
    );
    assert.ok(
      html.includes('href="/admin/services"'),
      `${path}: services link`,
    );
    router.dispose();
  }
  const noop = () => {};
  const rowHtml = renderToString(
    createElement(ServiceCard, {
      service: demo.services[0],
      category: "Маникюр",
      onEdit: noop,
      onPrice: noop,
      onDelete: noop,
    }),
  );
  assert.ok(rowHtml.includes("Удалить"));
  assert.ok(rowHtml.includes("Редактировать"));
  client.setQueryData(
    ["admin-specialists", 1],
    [
      {
        id: 42,
        name: "Анна",
        organization_id: 1,
        description: null,
        service_ids: [demo.services[0].id],
      },
    ],
  );
  const serviceHtml = renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(ServiceDialog, {
        service: demo.services[0],
        categories: demo.categories,
        onSave: noop,
        onClose: noop,
      }),
    ),
  );
  assert.ok(serviceHtml.includes(demo.services[0].name));
  assert.ok(serviceHtml.includes('value="2000"'));
  assert.ok(serviceHtml.includes("Анна"));
  const priceHtml = renderToString(
    createElement(PriceDialog, {
      service: demo.services[0],
      onSave: noop,
      onClose: noop,
    }),
  );
  assert.ok(priceHtml.includes("Новая цена"));
  assert.ok(!priceHtml.includes("Старая цена"));
  assert.ok(!priceHtml.includes("Минимальная цена"));
  assert.ok(!priceHtml.includes("Максимальная цена"));
  assert.ok(priceHtml.includes("Дополнительные параметры"));
  assert.ok(!priceHtml.includes("Удалить услугу"));
  const appointmentHtml = renderToString(
    createElement(AppointmentDialog, {
      appointment: demo.appointments[0],
      onClose: noop,
    }),
  );
  assert.ok(appointmentHtml.includes(demo.appointments[0].client));
  assert.ok(appointmentHtml.includes(demo.appointments[0].phone));
  const weekHtml = renderToString(
    createElement(AdminWeekCalendar, {
      date: demo.appointments[0].date,
      appointments: demo.appointments,
      onDate: noop,
      onSelect: noop,
    }),
  );
  assert.ok(weekHtml.includes("Предыдущая неделя"));
  assert.ok(weekHtml.includes(demo.appointments[0].service));
  const adminCalendar = renderToString(
    createElement(BookingCalendar, {
      date: "2020-01-01",
      onDate: noop,
      allowPast: true,
    }),
  );
  assert.match(adminCalendar, /aria-label="Предыдущий месяц"(?![^>]*disabled)/);
  assert.match(
    adminCalendar,
    /aria-label="1 января 2020 г\."(?![^>]*disabled)/,
  );
  const bookingCalendar = renderToString(
    createElement(BookingCalendar, { date: "", onDate: noop }),
  );
  assert.match(bookingCalendar, /aria-label="Предыдущий месяц"[^>]*disabled/);
  console.log("PASS: admin routes, navigation and dialog rendering");
} finally {
  await server.close();
}
