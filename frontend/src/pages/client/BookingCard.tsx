import { CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button/Button";
import { isUpcoming } from "./clientData";
import type { ClientBooking } from "./clientData";
import styles from "./Client.module.css";

export function BookingCard({
  booking,
  onDetails,
  onCancel,
  onReschedule,
}: {
  booking: ClientBooking;
  onDetails?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const upcoming = isUpcoming(booking);
  const label =
    booking.status === "cancelled"
      ? "Отменена"
      : upcoming
        ? "Подтверждена"
        : "Завершена";
  const duration =
    booking.duration == null
      ? null
      : [
          Math.floor(booking.duration / 60)
            ? `${Math.floor(booking.duration / 60)} ч`
            : "",
          booking.duration % 60 ? `${booking.duration % 60} мин` : "",
        ]
          .filter(Boolean)
          .join(" ");
  return (
    <article className={styles.bookingCard}>
      <div className={styles.cardPicture} aria-hidden="true" />
      <div className={styles.cardInfo}>
        <h3>{booking.service}</h3>
        <span className={styles.org}>{booking.organization}</span>
        <span className={styles.org}>
          <UserRound size={14} /> Мастер: {booking.specialist}
        </span>
        {booking.address && (
          <span className={styles.org}>
            <MapPin size={14} /> {booking.address}
          </span>
        )}
      </div>
      <div className={styles.cardDate}>
        <span>
          <CalendarDays size={15} />{" "}
          {new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
          }).format(new Date(`${booking.date}T00:00:00`))}
        </span>
        <span>
          <Clock size={15} /> {booking.time}
        </span>
        {duration && <small>Длительность ≈ {duration}</small>}
      </div>
      <span
        className={`${styles.badge} ${booking.status === "cancelled" ? styles.cancelled : upcoming ? styles.upcoming : ""}`}
      >
        ● {label}
      </span>
      <div className={styles.cardActions}>
        {onDetails && (
          <Button variant="secondary" onClick={onDetails}>
            Подробнее
          </Button>
        )}
        {upcoming && onReschedule && (
          <Button variant="secondary" onClick={onReschedule}>
            <CalendarDays size={14} aria-hidden="true" /> Перенести
          </Button>
        )}
        {upcoming && onCancel && (
          <Button
            variant="secondary"
            className={styles.cancelAction}
            onClick={onCancel}
          >
            × Отменить
          </Button>
        )}
      </div>
    </article>
  );
}
