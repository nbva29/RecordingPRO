import { useAuthSession } from "../../auth/authSession";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminApi";
import styles from "./Admin.module.css";

export function AdminStatisticsPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const organizationId =
    useAuthSession((state) => state.user?.organization_id) ?? 0;
  const periodRef = useRef<HTMLDetailsElement>(null);
  const data = useQuery({
    queryKey: ["admin-statistics", organizationId, periodDays],
    queryFn: ({ signal }) =>
      adminApi.statistics(organizationId, periodDays, signal),
    retry: false,
  });
  const stats = data.data;
  const total = stats?.counts.total ?? 0;
  const completed = stats?.counts.completed ?? 0;
  const cancelled = stats?.counts.cancelled ?? 0;
  const changePercent = stats?.percentages.total_change ?? null;
  const weeks = Array.from({ length: Math.ceil(periodDays / 7) }, (_, i) => {
    if (!stats) return 0;
    const from = new Date(`${stats.date_from}T00:00:00`);
    from.setDate(from.getDate() + i * 7);
    const until = new Date(from);
    until.setDate(until.getDate() + 7);
    return stats.daily
      .filter((item) => {
        const day = new Date(`${item.date}T00:00:00`);
        return day >= from && day < until;
      })
      .reduce((sum, item) => sum + item.total, 0);
  });
  const groups = (stats?.popular_services ?? []).map((item) => ({
    name: item.name,
    count: item.appointments_count,
  }));
  const max = Math.max(1, ...weeks);
  return (
    <main className={`${styles.page} ${styles.statisticsPage}`}>
      <div className={styles.heading}>
        <div>
          <h1>Аналитика записей</h1>
          <p className={styles.subtitle}>
            Ключевые показатели работы вашей организации
          </p>
        </div>
        <details
          ref={periodRef}
          className={styles.periodMenu}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              event.currentTarget.open = false;
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className={styles.period}>
            Последние {periodDays} дней
            <span className={styles.periodArrow} aria-hidden="true" />
          </summary>
          <div className={styles.periodOptions}>
            {[7, 30, 90].map((days) => (
              <button
                type="button"
                key={days}
                className={
                  days === periodDays ? styles.periodSelected : undefined
                }
                aria-pressed={days === periodDays}
                onClick={() => {
                  setPeriodDays(days);
                  if (periodRef.current) periodRef.current.open = false;
                }}
              >{`Последние ${days} дней`}</button>
            ))}
          </div>
        </details>
      </div>
      {data.isPending ? (
        <p role="status">Загружаем данные…</p>
      ) : data.isError ? (
        <div role="alert">
          <p>
            {data.error instanceof Error
              ? data.error.message
              : "Не удалось загрузить данные."}
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => data.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          <div className={styles.overviewGrid}>
            <section className={styles.stat}>
              <span>Всего записей</span>
              <strong>{total}</strong>
              <small>
                {changePercent === null
                  ? "Нет данных для сравнения"
                  : `${changePercent > 0 ? "+" : ""}${changePercent.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% к прошлому периоду`}
              </small>
            </section>
            <section className={styles.stat}>
              <span>Завершено</span>
              <strong>{completed}</strong>
              <small>{stats?.percentages.completed}% от всех записей</small>
            </section>
            <section className={styles.stat}>
              <span>Отменено</span>
              <strong>{cancelled}</strong>
              <small>{stats?.percentages.cancelled}% от всех записей</small>
            </section>
          </div>
          <div className={styles.dashboardGrid}>
            <section className={styles.section}>
              <h2>Количество записей</h2>
              <p className={styles.subtitle}>По неделям</p>
              <div
                className={styles.chart}
                role="img"
                aria-label={`Количество записей по неделям: ${weeks.join(", ")}`}
              >
                {weeks.map((value, index) => (
                  <div
                    className={styles.chartColumn}
                    key={index}
                    style={{ width: `${100 / weeks.length}%` }}
                  >
                    <div
                      className={styles.chartBar}
                      style={{
                        height: `${value ? Math.max(12, (value / max) * 100) : 0}%`,
                      }}
                    />
                    <strong>{value}</strong>
                    <small>{index + 1} нед.</small>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.section}>
              <h2>Популярные услуги</h2>
              {groups.length ? (
                groups.map((item) => (
                  <div className={styles.popular} key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.count}</span>
                    </div>
                    <div className={styles.progress}>
                      <span
                        style={{
                          width: `${(item.count / Math.max(1, total)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>Нет записей за выбранный период.</p>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
