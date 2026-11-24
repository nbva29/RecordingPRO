import { Button } from "../../components/ui/Button/Button";
import { appointmentStatus, formatAdminDate } from "./adminData";
import type { AdminAppointment } from "./adminData";
import styles from "./Admin.module.css";

export function AppointmentCard({
  appointment,
  onDetails,
  showDate = false,
}: {
  appointment: AdminAppointment;
  onDetails: () => void;
  showDate?: boolean;
}) {
  return (
    <article className={styles.appointment}>
      <div className={styles.appointmentTime}>
        <strong>{appointment.time}</strong>
        {showDate && <small>{formatAdminDate(appointment.date)}</small>}
      </div>
      <div className={styles.appointmentInfo}>
        <h3>{appointment.service}</h3>
        <p>
          {appointment.client} · {appointment.specialist}
        </p>
      </div>
      <span
        className={`${styles.badge} ${appointment.status === "confirmed" ? styles.confirmed : ""}`}
      >
        {appointmentStatus[appointment.status]}
      </span>
      <Button variant="secondary" onClick={onDetails}>
        Подробнее
      </Button>
    </article>
  );
}
