import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { BookingCard } from "./BookingCard";
import { BookingDialog } from "./BookingDialog";
import { useClient } from "./useClient";
import { splitBookings } from "./clientData";
import styles from "./Client.module.css";

type Selection = {
  id: string;
  mode: "details" | "cancel" | "reschedule";
} | null;
type Filter = "upcoming" | "past" | "cancelled";
export function ClientBookingsPage() {
  const { bookings, cancel, reschedule } = useClient();
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const [selection, setSelection] = useState<Selection>(() =>
    params.get("details")
      ? { id: params.get("details")!, mode: "details" }
      : null,
  );
  const [filter, setFilter] = useState<Filter>(() =>
    hash === "#history" ? "past" : "upcoming",
  );
  const [message, setMessage] = useState("");
  const { upcoming, history } = splitBookings(bookings.data ?? []);
  const past = history.filter((item) => item.status !== "cancelled");
  const cancelled = history.filter((item) => item.status === "cancelled");
  const selected = bookings.data?.find((item) => item.id === selection?.id);
  useEffect(() => {
    if (hash === "#history" && bookings.isSuccess)
      document.getElementById("history")?.scrollIntoView();
  }, [hash, bookings.isSuccess]);
  function closeDialog() {
    setSelection(null);
    if (params.has("details")) {
      const next = new URLSearchParams(params);
      next.delete("details");
      setParams(next, { replace: true });
    }
  }
  return (
    <main className={`${styles.page} ${styles.bookingsPage}`}>
      <div className={styles.pageHeading}>
        <div>
          <h1>Мои записи</h1>
          <p className={styles.subtitle}>
            Управляйте вашими предстоящими и прошедшими визитами
          </p>
        </div>
        <div className={styles.headingActions}>
          <Link className={styles.outlineLink} to="/search">
            ⌕ Найти услуги
          </Link>
          <Link className={styles.primaryLink} to="/search">
            + Записаться
          </Link>
        </div>
      </div>
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      {bookings.isPending ? (
        <p role="status">Загружаем записи…</p>
      ) : bookings.isError ? (
        <div className={styles.section} role="alert">
          <p>Не удалось загрузить записи.</p>
          <button
            className={styles.textButton}
            onClick={() => bookings.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          <div className={styles.filters} aria-label="Фильтр записей">
            {(
              [
                ["upcoming", "Предстоящие", upcoming.length],
                ["past", "Прошедшие", past.length],
                ["cancelled", "Отменённые", cancelled.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                type="button"
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? styles.filterActive : ""}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {filter === "upcoming" && (
            <section className={styles.lowerSection}>
              <div className={styles.sectionHeader}>
                <h2>Предстоящие записи</h2>
                <small>Сначала ближайшие</small>
              </div>
              {upcoming.length ? (
                <div className={styles.list}>
                  {upcoming.map((item) => (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      onDetails={() =>
                        setSelection({ id: item.id, mode: "details" })
                      }
                      onCancel={() =>
                        setSelection({ id: item.id, mode: "cancel" })
                      }
                      onReschedule={() =>
                        setSelection({ id: item.id, mode: "reschedule" })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <p>Предстоящих записей пока нет.</p>
                  <Link className={styles.primaryLink} to="/search">
                    Записаться на услугу →
                  </Link>
                </div>
              )}
            </section>
          )}
          {(filter === "upcoming" ||
            filter === "past" ||
            filter === "cancelled") && (
            <section className={styles.lowerSection} id="history">
              <div className={styles.sectionHeader}>
                <h2>
                  {filter === "cancelled"
                    ? "Отменённые записи"
                    : "История посещений"}
                </h2>
                <small>Сначала новые</small>
              </div>
              {(filter === "cancelled" ? cancelled : past).length ? (
                <div className={styles.list}>
                  {(filter === "cancelled" ? cancelled : past).map((item) => (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      onDetails={() =>
                        setSelection({ id: item.id, mode: "details" })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  {filter === "cancelled"
                    ? "Отменённых записей нет."
                    : "История записей пуста."}
                </div>
              )}
            </section>
          )}
        </>
      )}
      {selection && selected && (
        <BookingDialog
          key={`${selection.id}:${selection.mode}`}
          booking={selected}
          mode={selection.mode}
          onClose={closeDialog}
          onCancel={() => {
            cancel(selected.id);
            closeDialog();
            setMessage("");
          }}
          onReschedule={(date, time) => {
            reschedule(selected.id, date, time);
            closeDialog();
            setMessage("Демонстрационная запись перенесена.");
          }}
        />
      )}
    </main>
  );
}
