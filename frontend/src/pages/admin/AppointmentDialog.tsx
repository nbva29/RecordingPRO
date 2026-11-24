import { Button } from "../../components/ui/Button/Button";
import { AdminDialog } from "./AdminDialog";
import { appointmentStatus, formatAdminDate } from "./adminData";
import type { AdminAppointment } from "./adminData";
import styles from "./Admin.module.css";

export function AppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: AdminAppointment;
  onClose: () => void;
}) {
  return (
    <AdminDialog title="Подробности записи" onClose={onClose}>
      <dl className={styles.details}>
        <div>
          <dt>Клиент</dt>
          <dd>{appointment.client}</dd>
        </div>
        <div>
          <dt>Телефон</dt>
          <dd>{appointment.phone || "Не указан"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{appointment.email || "Не указан"}</dd>
        </div>
        <div>
          <dt>Услуга</dt>
          <dd>{appointment.service}</dd>
        </div>
        <div>
          <dt>Специалист</dt>
          <dd>{appointment.specialist}</dd>
        </div>
        <div>
          <dt>Дата и время</dt>
          <dd>
            {formatAdminDate(appointment.date)} · {appointment.time}
          </dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{appointmentStatus[appointment.status]}</dd>
        </div>
      </dl>
      <div className={styles.dialogActions}>
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </AdminDialog>
  );
}
