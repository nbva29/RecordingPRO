import { Link } from "react-router-dom";
import styles from "./OrganizationCard.module.css";

interface OrganizationCardProps {
  id: number;
  name: string;
  description: string | null;
  price?: number;
  background: string;
}

export function OrganizationCard({
  id,
  name,
  description,
  price,
  background,
}: OrganizationCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.banner} style={{ backgroundColor: background }}>
        <span>{name}</span>
      </div>

      <div className={styles.content}>
        <h3>{name}</h3>
        {description && <p>{description}</p>}

        <div className={styles.footer}>
          {price !== undefined && <span className={styles.price}>
            От {price.toLocaleString("ru-RU")} ₽
          </span>}

          <Link to={`/organizations/${id}`} className={styles.detailsButton}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
