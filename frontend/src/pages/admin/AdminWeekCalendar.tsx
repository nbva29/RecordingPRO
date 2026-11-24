import { localDate } from "../booking/bookingState";
import { appointmentStatus } from "./adminData";
import type { AdminAppointment } from "./adminData";
import styles from "./Admin.module.css";

export function AdminWeekCalendar({
  date,
  appointments,
  onDate,
  onSelect,
}: {
  date: string;
  appointments: AdminAppointment[];
  onDate: (value: string) => void;
  onSelect: (item: AdminAppointment) => void;
}) {
  const current = new Date(`${date}T00:00:00`);
  const monday = new Date(current);
  monday.setDate(current.getDate() - ((current.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
  const shiftWeek = (amount: number) => {
    const next = new Date(current);
    next.setDate(current.getDate() + amount * 7);
    onDate(localDate(next));
  };
  const times = Array.from(
    { length: 13 },
    (_, i) => `${String(i + 8).padStart(2, "0")}:00`,
  );
  const formatShort = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  });
  return (
    <div className={styles.weekCalendar}>
      <div className={styles.weekHeader}>
        <div className={styles.weekNav}>
          <button
            type="button"
            aria-label="Предыдущая неделя"
            onClick={() => shiftWeek(-1)}
          >
            ‹
          </button>
          <strong>
            {formatShort.format(days[0])} – {formatShort.format(days[6])}{" "}
            {days[6].getFullYear()}
          </strong>
          <button
            type="button"
            aria-label="Следующая неделя"
            onClick={() => shiftWeek(1)}
          >
            ›
          </button>
        </div>
        <span>Неделя</span>
      </div>
      <div className={styles.weekGrid}>
        <div className={styles.weekLabel}>Время</div>
        {days.map((day) => (
          <button
            type="button"
            className={`${styles.dayHeading} ${localDate(day) === date ? styles.daySelected : ""}`}
            aria-pressed={localDate(day) === date}
            key={localDate(day)}
            onClick={() => onDate(localDate(day))}
          >
            {new Intl.DateTimeFormat("ru-RU", {
              weekday: "short",
              day: "numeric",
            }).format(day)}
          </button>
        ))}
        {times.map((time) => (
          <div className={styles.weekRow} key={time}>
            <span className={styles.hourLabel}>{time}</span>
            {days.map((day) => (
              <div className={styles.weekCell} key={localDate(day)}>
                {appointments
                  .filter(
                    (item) =>
                      item.date === localDate(day) &&
                      item.time.slice(0, 2) === time.slice(0, 2),
                  )
                  .map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={styles.weekAppointment}
                      onClick={() => onSelect(item)}
                    >
                      <strong>
                        {item.client} · {item.service}
                      </strong>
                      <small>{appointmentStatus[item.status]}</small>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
