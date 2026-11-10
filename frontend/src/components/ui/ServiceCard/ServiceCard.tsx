import { Link } from "react-router-dom";
import type { Service } from "../../../types/organization";
import styles from "./ServiceCard.module.css";

interface ServiceCardProps {
  service: Service;
  organizationId: number;
}

export function ServiceCard({ service, organizationId }: ServiceCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <h3>{service.name}</h3>
        <p>{service.duration} минут</p>
      </div>

      <div className={styles.actions}>
        <span className={styles.price}>
          {service.price.toLocaleString("ru-RU")} ₽
        </span>

        <Link
          to={`/booking/${organizationId}?service=${service.id}`}
          className={styles.selectButton}
        >
          Выбрать
        </Link>
      </div>
    </article>
  );
}
