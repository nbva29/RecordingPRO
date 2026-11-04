import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createServer } from "vite";

const cases = [
  ["/", "Главная страница"],
  ["/search", "Поиск услуг"],
  ["/organizations/42", "Карточка организации"],
  ["/booking/42", "Онлайн-запись"],
  ["/login", "Авторизация"],
  ["/register", "Регистрация"],
  ["/client", "Обзор"],
  ["/client/bookings", "Мои записи"],
  ["/client/profile", "Профиль"],
  ["/admin", "Обзор"],
  ["/admin/calendar", "Календарь"],
  ["/admin/services", "Услуги и цены"],
  ["/admin/statistics", "Статистика"],
];

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { routes } = await server.ssrLoadModule("/src/router/index.tsx");
  assert.ok(
    Array.isArray(routes),
    "Централизованная конфигурация маршрутов отсутствует",
  );

  function check(router, path, title) {
    const html = renderToString(createElement(RouterProvider, { router }));
    assert.ok(
      html.includes(`<h1>${title}</h1>`),
      `${path}: заголовок страницы`,
    );
    assert.equal(
      (html.match(/<header\b/g) ?? []).length,
      1,
      `${path}: один Header`,
    );
    assert.ok(html.includes('href="/search"'), `${path}: ссылка поиска`);
    assert.match(
      html,
      /<button\b[^>]*>Войти<\/button>/,
      `${path}: кнопка входа`,
    );

    const cabinet =
      /^\/(client|admin)(\/|$)/.test(path) && !path.endsWith("/unknown");
    assert.equal(
      (html.match(/<aside\b/g) ?? []).length,
      Number(cabinet),
      `${path}: Sidebar только в кабинете`,
    );
    if (cabinet) {
      const aside = html.match(/<aside\b[\s\S]*?<\/aside>/)[0];
      const links = [...aside.matchAll(/<a\b([^>]*)>/g)].map(
        (match) => match[1],
      );
      assert.equal(links.length, 4, `${path}: четыре пункта меню`);
      const active = links.filter((link) =>
        link.includes('aria-current="page"'),
      );
      assert.equal(active.length, 1, `${path}: один активный пункт`);
      assert.ok(active[0].includes(`href="${path}"`), `${path}: активный URL`);
      const destinations = path.startsWith("/client")
        ? ["/client", "/client/bookings", "/search", "/client/profile"]
        : ["/admin", "/admin/calendar", "/admin/services", "/admin/statistics"];
      for (const href of destinations)
        assert.ok(aside.includes(`href="${href}"`), `${path}: пункт ${href}`);
    }
  }

  for (const [path, title] of cases) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    try {
      check(router, path, title);
    } finally {
      router.dispose();
    }
  }

  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  try {
    for (const [path, title] of cases) {
      await router.navigate(path);
      check(router, path, title);
    }
    await router.navigate(-1);
  } finally {
    router.dispose();
  }

  console.log(
    `PASS: ${cases.length} прямых URL, переходы React Router и возврат назад; Header, Sidebar и активные ссылки`,
  );
} finally {
  await server.close();
}
