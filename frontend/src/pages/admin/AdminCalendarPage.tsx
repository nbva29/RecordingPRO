import { useAuthSession } from "../../auth/authSession";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminApi";
import { localDate } from "../booking/bookingState";
import { AdminWeekCalendar } from "./AdminWeekCalendar";
import { AppointmentDialog } from "./AppointmentDialog";
import { ScheduleDialog } from "./ScheduleDialog";
import { Button } from "../../components/ui/Button/Button";
import type { AdminAppointment } from "./adminData";
import styles from "./Admin.module.css";

export function AdminCalendarPage() {
  const [date, setDate] = useState(() => localDate(new Date()));
  const organizationId =
    useAuthSession((state) => state.user?.organization_id) ?? 0;
  const [today] = useState(() => localDate(new Date()));
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const from = localDate(day);
  day.setDate(day.getDate() + 6);
  const to = localDate(day);
  const data = useQuery({
    queryKey: ["admin-calendar", organizationId, from, to],
    queryFn: ({ signal }) =>
      adminApi.appointments(organizationId, from, to, signal),
    retry: false,
    select: (rows) =>
      rows.map((item) => ({
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
  });
  const todayData = useQuery({
    queryKey: ["admin-calendar-today", organizationId, today],
    queryFn: ({ signal }) =>
      adminApi.appointments(organizationId, today, today, signal),
    retry: false,
  });
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const appointments = todayData.data ?? [];
  return (
    <main className={`${styles.page} ${styles.calendarPage}`}>
      <div className={styles.heading}>
        <div>
          <h1>Запись клиентов</h1>
          <p className={styles.subtitle}>
            Все записи на сегодня и ближайшую неделю
          </p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>
          Расписание мастеров
        </Button>
      </div>
      {data.isPending ? (
        <p role="status">Загружаем записи…</p>
      ) : data.isError ? (
        <div role="alert">
          <p>
            {data.error instanceof Error
              ? data.error.message
              : "Не удалось загрузить записи."}
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
              <span>Записей сегодня</span>
              <strong>{todayData.isSuccess ? appointments.length : "—"}</strong>
            </section>
            <section className={styles.stat}>
              <span>Подтверждено</span>
              <strong>
                {todayData.isSuccess
                  ? appointments.filter((item) => item.status === "confirmed")
                      .length
                  : "—"}
              </strong>
            </section>
            <section className={styles.stat}>
              <span>Свободных слотов</span>
              <strong>—</strong>
              <small>Общий подсчёт недоступен</small>
            </section>
          </div>
          <section className={styles.section}>
            <AdminWeekCalendar
              date={date}
              appointments={data.data ?? []}
              onDate={setDate}
              onSelect={setSelected}
            />
          </section>
        </>
      )}
      {selected && (
        <AppointmentDialog
          appointment={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {scheduleOpen && (
        <ScheduleDialog
          organizationId={organizationId}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </main>
  );
}
