import { useRef, useState } from "react";
import { useAdmin } from "./useAdmin";
import styles from "./Admin.module.css";

export function AdminStatisticsPage() {
  const { data } = useAdmin();
  const [today] = useState(() => new Date());
  const [periodDays, setPeriodDays] = useState(30);
  const periodRef = useRef<HTMLDetailsElement>(null);
  const items = data.data?.appointments ?? [];
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const start = new Date(end);
  start.setDate(end.getDate() - periodDays);
  const inPeriod = items.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date >= start && date < end;
  });
  const previousStart = new Date(start);
  previousStart.setDate(start.getDate() - periodDays);
  const previousCount = items.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date >= previousStart && date < start;
  }).length;
  const changePercent = previousCount ? ((inPeriod.length - previousCount) / previousCount) * 100 : null;
  const percentage = (value: number) => inPeriod.length ? `${((value / inPeriod.length) * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%` : "—";
  const completed = inPeriod.filter(
    (item) => item.status === "completed",
  ).length;
  const cancelled = inPeriod.filter(
    (item) => item.status === "cancelled",
  ).length;
  const weeks = Array.from(
    { length: Math.ceil(periodDays / 7) },
    (_, i) =>
      inPeriod.filter((item) => {
        const day = new Date(`${item.date}T00:00:00`);
        return (
          day >=
            new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate() + i * 7,
            ) &&
          day <
            new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate() + Math.min((i + 1) * 7, periodDays),
            )
        );
      }).length,
  );
  const groups = [...new Set(inPeriod.map((item) => item.service))]
    .map((name) => ({
      name,
      count: inPeriod.filter((item) => item.service === name).length,
    }))
    .sort((a, b) => b.count - a.count);
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
          <p>Не удалось загрузить данные.</p>
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
              <strong>{inPeriod.length}</strong>
              <small>{changePercent === null ? "Нет данных для сравнения" : `${changePercent > 0 ? "+" : ""}${changePercent.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% к прошлому периоду`}</small>
            </section>
            <section className={styles.stat}>
              <span>Завершено</span>
              <strong>{completed}</strong>
              <small>{percentage(completed)} от всех записей</small>
            </section>
            <section className={styles.stat}>
              <span>Отменено</span>
              <strong>{cancelled}</strong>
              <small>{percentage(cancelled)} от всех записей</small>
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
                          width: `${(item.count / inPeriod.length) * 100}%`,
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
