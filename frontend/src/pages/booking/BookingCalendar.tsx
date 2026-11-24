import { useState } from "react";
import { localDate } from "./bookingState";
import styles from "./Booking.module.css";

export function BookingCalendar({
  date,
  onDate,
  allowPast = false,
}: {
  date: string;
  onDate: (date: string) => void;
  allowPast?: boolean;
}) {
  const [today] = useState(() => localDate(new Date()));
  const [month, setMonth] = useState(() => {
    const d =
      date && (allowPast || date >= today)
        ? new Date(`${date}T00:00:00`)
        : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const currentMonth = new Date(`${today.slice(0, 7)}-01T00:00:00`);
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(
    month,
  );
  return (
    <>
      <div className={styles.month}>
        <strong>
          {monthLabel} {month.getFullYear()}
        </strong>
        <div>
          <button
            type="button"
            aria-label="Предыдущий месяц"
            disabled={!allowPast && month <= currentMonth}
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Следующий месяц"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <span className={styles.weekday} key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span className={styles.emptyDay} key={`empty${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const value = localDate(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          return (
            <button
              type="button"
              key={value}
              disabled={!allowPast && value < today}
              aria-label={new Intl.DateTimeFormat("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(`${value}T00:00:00`))}
              aria-pressed={date === value}
              className={date === value ? styles.activeDay : ""}
              onClick={() => onDate(value)}
            >
              <span>{i + 1}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
