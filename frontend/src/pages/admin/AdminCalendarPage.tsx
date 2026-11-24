import { useState } from "react";
import { localDate } from "../booking/bookingState";
import { AdminWeekCalendar } from "./AdminWeekCalendar";
import { AppointmentDialog } from "./AppointmentDialog";
import { appointmentsForDate } from "./adminData";
import type { AdminAppointment } from "./adminData";
import { useAdmin } from "./useAdmin";
import styles from "./Admin.module.css";

export function AdminCalendarPage() {
  const { data } = useAdmin();
  const [date, setDate] = useState(() => localDate(new Date()));
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const appointments = appointmentsForDate(
    data.data?.appointments ?? [],
    localDate(new Date()),
  );
  return (
    <main className={`${styles.page} ${styles.calendarPage}`}>
      <h1>Запись клиентов</h1>
      <p className={styles.subtitle}>
        Все записи на сегодня и ближайшую неделю
      </p>
      {data.isPending ? (
        <p role="status">Загружаем записи…</p>
      ) : data.isError ? (
        <div role="alert">
          <p>Не удалось загрузить записи.</p>
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
              <strong>{appointments.length}</strong>
            </section>
            <section className={styles.stat}>
              <span>Подтверждено</span>
              <strong>
                {
                  appointments.filter((item) => item.status === "confirmed")
                    .length
                }
              </strong>
            </section>
            <section className={styles.stat}>
              <span>Свободных слотов</span>
              <strong>—</strong>
              <small>Расписание не подключено</small>
            </section>
          </div>
          <section className={styles.section}>
            <AdminWeekCalendar
              date={date}
              appointments={data.data?.appointments ?? []}
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
    </main>
  );
}
