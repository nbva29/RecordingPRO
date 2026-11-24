import type { AdminService } from "./adminData";
import styles from "./Admin.module.css";

export function ServiceCard({
  service,
  category,
  onEdit,
  onPrice,
  onDelete,
}: {
  service: AdminService;
  category: string;
  onEdit: () => void;
  onPrice: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={styles.serviceRow}>
      <div className={styles.rowName}>
        <h3>{service.name}</h3>
        {service.description && <small>{service.description}</small>}
      </div>
      <span>{category}</span>
      <span>{service.duration} мин</span>
      <button
        type="button"
        className={styles.priceButton}
        onClick={onPrice}
        aria-label={`Изменить цену: ${service.name}`}
        title="Изменить цену"
      >
        {service.price.toLocaleString("ru-RU")} ₽
      </button>
      <div className={styles.rowActions}>
        <button type="button" className={styles.editButton} onClick={onEdit}>
          Редактировать
        </button>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onDelete}
          aria-label={`Удалить услугу ${service.name}`}
        >
          Удалить
        </button>
      </div>
    </article>
  );
}
