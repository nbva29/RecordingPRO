import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { BookingCalendar } from "../booking/BookingCalendar";
import { localDate } from "../booking/bookingState";
import { formatDate } from "./clientData";
import type { ClientBooking } from "./clientData";
import styles from "./Client.module.css";

type Mode = "details" | "cancel" | "reschedule";
export function BookingDialog({
  mode,
  booking,
  onClose,
  onCancel,
  onReschedule,
}: {
  mode: Mode;
  booking: ClientBooking;
  onClose: () => void;
  onCancel: () => void;
  onReschedule: (date: string, time: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [today] = useState(() => localDate(new Date()));
  const [now] = useState(() => new Date());
  const times = [
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ].filter((value) => date !== today || new Date(`${date}T${value}:00`) > now);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="booking-dialog-title"
    >
      <div className={styles.dialogHeader}>
        <h2 id="booking-dialog-title">
          {mode === "details"
            ? "Подробности записи"
            : mode === "cancel"
              ? "Отменить запись?"
              : "Перенести запись"}
        </h2>
        <button
          className={styles.close}
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className={styles.muted}>
        {booking.organization} · {booking.service}
      </p>
      {mode === "details" && (
        <dl className={styles.details}>
          <div>
            <dt>Специалист</dt>
            <dd>{booking.specialist}</dd>
          </div>
          <div>
            <dt>Дата и время</dt>
            <dd>
              {formatDate(booking.date)} · {booking.time}
            </dd>
          </div>
          {booking.address && (
            <div>
              <dt>Адрес</dt>
              <dd>{booking.address}</dd>
            </div>
          )}
          {booking.duration != null && (
            <div>
              <dt>Длительность</dt>
              <dd>{booking.duration} мин</dd>
            </div>
          )}
          <div>
            <dt>Стоимость</dt>
            <dd>
              {booking.price == null
                ? "Не указана"
                : `${booking.price.toLocaleString("ru-RU")} ₽`}
            </dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>
              {booking.status === "cancelled" ? "Отменена" : "Подтверждена"}
            </dd>
          </div>
        </dl>
      )}
      {mode === "cancel" && (
        <p>
          Отменить демонстрационную запись на {formatDate(booking.date)} в{" "}
          {booking.time}?
        </p>
      )}
      {mode === "reschedule" && (
        <>
          <p>Выберите новую дату и время. Доступность показана для примера.</p>
          <BookingCalendar
            date={date}
            onDate={(value) => {
              setDate(value);
              setTime("");
            }}
          />
          <h3>Время</h3>
          {!date ? (
            <p className={styles.muted}>Выберите дату</p>
          ) : times.length === 0 ? (
            <p>На эту дату нет времени.</p>
          ) : (
            <div className={styles.slots}>
              {times.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={time === value}
                  className={time === value ? styles.slotActive : ""}
                  onClick={() => setTime(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className={styles.dialogActions}>
        <Button variant="secondary" onClick={onClose}>
          {mode === "details" ? "Закрыть" : "Назад"}
        </Button>
        {mode === "cancel" && (
          <Button onClick={onCancel}>Отменить запись</Button>
        )}
        {mode === "reschedule" && (
          <Button
            disabled={!date || !time}
            onClick={() => onReschedule(date, time)}
          >
            Подтвердить перенос
          </Button>
        )}
      </div>
    </dialog>
  );
}
