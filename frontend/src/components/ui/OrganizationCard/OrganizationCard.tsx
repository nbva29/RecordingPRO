import { Link } from "react-router-dom";
import styles from "./OrganizationCard.module.css";

interface OrganizationCardProps {
  id: number;
  shortName: string;
  name: string;
  description: string;
  price: number;
  background: string;
}

export function OrganizationCard({
  id,
  shortName,
  name,
  description,
  price,
  background,
}: OrganizationCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.banner} style={{ backgroundColor: background }}>
        <span>{shortName}</span>
      </div>

      <div className={styles.content}>
        <h3>{name}</h3>
        <p>{description}</p>

        <div className={styles.footer}>
          <span className={styles.price}>
            От {price.toLocaleString("ru-RU")} ₽
          </span>

          <Link to={`/organizations/${id}`} className={styles.detailsButton}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
