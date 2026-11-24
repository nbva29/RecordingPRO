import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "../../api/bookingApi";
import { ApiError } from "../../api/httpClient";
import { Button } from "../../components/ui/Button/Button";
import { BookingCalendar } from "../booking/BookingCalendar";
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
  onCancel: () => Promise<void>;
  onReschedule: (date: string, time: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitLock = useRef(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const slots = useQuery({
    queryKey: [
      "client-reschedule-slots",
      booking.specialistId,
      booking.serviceId,
      date,
    ],
    queryFn: ({ signal }) =>
      bookingApi.getSlots(
        booking.specialistId!,
        booking.serviceId!,
        date,
        signal,
      ),
    enabled:
      mode === "reschedule" &&
      !!date &&
      !!booking.specialistId &&
      !!booking.serviceId,
    retry: false,
    staleTime: 0,
  });
  const times =
    slots.data?.slots.map((slot) => slot.start_time.slice(0, 5)) ?? [];
  async function submit(action: () => Promise<void>) {
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "Запись изменить не удалось: время занято или изменение недоступно. Выберите другое время.",
        );
        setTime("");
        if (mode === "reschedule" && date) void slots.refetch();
      } else
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось выполнить действие. Попробуйте ещё раз.",
        );
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }
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
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (!pending && event.target === event.currentTarget) onClose();
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
          disabled={pending}
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
            <dt>Статус</dt>
            <dd>
              {booking.status === "cancelled"
                ? "Отменена"
                : booking.status === "completed"
                  ? "Завершена"
                  : booking.status === "created"
                    ? "Создана"
                    : "Подтверждена"}
            </dd>
          </div>
        </dl>
      )}
      {mode === "cancel" && (
        <p>
          Отменить запись на {formatDate(booking.date)} в {booking.time}?
        </p>
      )}
      {mode === "reschedule" && (
        <>
          <p>Выберите новую дату и время.</p>
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
          ) : slots.isFetching ? (
            <p role="status">Загружаем свободное время…</p>
          ) : slots.isError ? (
            <div role="alert">
              <p>Не удалось загрузить свободное время.</p>
              <button type="button" onClick={() => slots.refetch()}>
                Повторить
              </button>
            </div>
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
      {error && <p role="alert">{error}</p>}
      <div className={styles.dialogActions}>
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          {mode === "details" ? "Закрыть" : "Назад"}
        </Button>
        {mode === "cancel" && (
          <Button disabled={pending} onClick={() => void submit(onCancel)}>
            {pending ? "Отменяем…" : "Отменить запись"}
          </Button>
        )}
        {mode === "reschedule" && (
          <Button
            disabled={
              pending ||
              !date ||
              !time ||
              slots.isFetching ||
              slots.isError ||
              !times.includes(time)
            }
            onClick={() => void submit(() => onReschedule(date, time))}
          >
            {pending ? "Переносим…" : "Подтвердить перенос"}
          </Button>
        )}
      </div>
    </dialog>
  );
}
