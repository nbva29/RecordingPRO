import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/authSession";
import { localDate } from "../booking/bookingState";
import { AppointmentDialog } from "./AppointmentDialog";
import { appointmentStatus } from "./adminData";
import type { AdminAppointment } from "./adminData";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminApi";
import styles from "./Admin.module.css";

export function AdminOverviewPage() {
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const organizationId =
    useAuthSession((state) => state.user?.organization_id) ?? 0;
  const [now] = useState(() => new Date());
  const from = localDate(now);
  const [until] = useState(() => {
    const day = new Date();
    day.setDate(day.getDate() + 7);
    return localDate(day);
  });
  const data = useQuery({
    queryKey: ["admin-overview", organizationId, from, until],
    queryFn: async ({ signal }) => {
      const [rows, statistics] = await Promise.all([
        adminApi.appointments(organizationId, from, until, signal),
        adminApi.statistics(organizationId, 30, signal),
      ]);
      return {
        statistics,
        appointments: rows.map((item) => ({
          id: item.id,
          date: item.appointment_date,
          time: item.start_time.slice(0, 5),
          service: item.service.name,
          specialist: item.specialist.name,
          client: item.client.name || item.client.email,
          phone: item.client.phone,
          email: item.client.email,
          status: item.status,
        })),
      };
    },
    retry: false,
  });
  const name = useAuthSession((state) => state.user?.name);
  const appointments = data.data?.appointments ?? [];
  const today = appointments.filter((item) => item.date === localDate(now));
  const upcoming = appointments
    .filter(
      (item) =>
        item.status === "confirmed" &&
        new Date(`${item.date}T${item.time}:00`) >= now,
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 3);
  return (
    <main className={`${styles.page} ${styles.dashboard}`}>
      <div className={styles.heading}>
        <div>
          <h1>Добро пожаловать{name ? `, ${name}` : ""}!</h1>
          <p className={styles.subtitle}>Обзор работы вашей организации</p>
        </div>
        <Link className={styles.primaryLink} to="/admin/services">
          + Добавить запись
        </Link>
      </div>
      {data.isPending ? (
        <p role="status">Загружаем данные…</p>
      ) : data.isError ? (
        <div role="alert">
          <p>Не удалось загрузить данные.</p>
          <ButtonRetry onRetry={() => data.refetch()} />
        </div>
      ) : (
        <>
          <div className={styles.overviewGrid}>
            <section className={styles.stat}>
              <span>Записей сегодня</span>
              <strong>{today.length}</strong>
              <small>
                {today.filter((item) => item.status === "confirmed").length}{" "}
                подтверждено
              </small>
            </section>
            <section className={styles.stat}>
              <span>Новых клиентов</span>
              <strong>—</strong>
              <small>Данные недоступны</small>
            </section>
            <section className={styles.stat}>
              <span>Всего записей</span>
              <strong>{data.data?.statistics.counts.total ?? "—"}</strong>
              <small>За последние 30 дней</small>
            </section>
          </div>
          <div className={styles.dashboardGrid}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Ближайшие записи</h2>
              </div>
              {upcoming.length ? (
                <div className={styles.list}>
                  {upcoming.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={styles.overviewAppointment}
                      onClick={() => setSelected(item)}
                    >
                      <strong>{item.time}</strong>
                      <span>
                        <b>{item.client}</b>
                        <small>{item.service}</small>
                      </span>
                      <small>{appointmentStatus[item.status]}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  Предстоящих записей пока нет.
                </div>
              )}
            </section>
          </div>
        </>
      )}
      {selected && (
        <AppointmentDialog
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
function ButtonRetry({ onRetry }: { onRetry: () => unknown }) {
  return (
    <button
      type="button"
      className={styles.textButton}
      onClick={() => {
        void onRetry();
      }}
    >
      Повторить
    </button>
  );
}
