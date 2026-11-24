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
  const user = {
    id: "test-client",
    name: "Анна",
    email: "anna@example.com",
    phone: null,
    role: { id: 1, name: "client" },
  };
  const session = {
    user,
    status: "authenticated",
    accessToken: "test-token",
    expiresAt: Date.now() + 60000,
  };
  useAuthSession.setState(session);
  Object.assign(useAuthSession.getInitialState(), session);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(["client-profile", user.id], user);
  queryClient.setQueryData(
    ["client-bookings", user.id],
    [
      {
        id: "booking-1",
        organization: "Организация",
        service: "Услуга",
        specialist: "Специалист",
        date: "2099-01-01",
        time: "10:00",
        price: null,
        address: "Тверская, 12",
        duration: 60,
        status: "confirmed",
      },
    ],
  );
  for (const [path, expected] of [
    ["/client", "Здравствуйте"],
    ["/client/bookings", "Предстоящие записи"],
    ["/client/profile", "Личные данные"],
  ]) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(RouterProvider, { router }),
      ),
    );
    assert.ok(
      html.includes(expected),
      `${path}: ${expected}; rendered: ${html.slice(0, 500)}`,
    );
    assert.ok(html.includes('href="/search"'), `${path}: search link`);
    assert.ok(
      html.includes('href="/client/bookings"'),
      `${path}: bookings link`,
    );
    if (path === "/client/bookings") {
      assert.ok(html.includes("Тверская, 12"), "booking address is rendered");
      assert.ok(html.includes("Длительность"), "booking duration is rendered");
    }
    router.dispose();
  }
  console.log("PASS: authenticated client routes and navigation links");
} finally {
  await server.close();
}
