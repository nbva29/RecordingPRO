import { Link } from "react-router-dom";
import styles from "./SearchOrganizationCard.module.css";

export interface SearchOrganization {
  id: number;
  name: string;
  category: string;
  description: string;
  address: string;
  background: string;
  services: {
    name: string;
    price: number;
  }[];
  nextAvailable: string;
}

interface SearchOrganizationCardProps {
  organization: SearchOrganization;
}

export function SearchOrganizationCard({
  organization,
}: SearchOrganizationCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div
          className={styles.image}
          style={{ backgroundColor: organization.background }}
        />

        <div className={styles.information}>
          <div className={styles.heading}>
            <h3>{organization.name}</h3>
            <span className={styles.category}>{organization.category}</span>
          </div>

          <p className={styles.description}>{organization.description}</p>

          <p className={styles.address}>{organization.address}</p>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.services}>
          {organization.services.map((service) => (
            <div key={service.name} className={styles.service}>
              <span>{service.name}</span>
              <strong>{service.price.toLocaleString("ru-RU")} ₽</strong>
            </div>
          ))}
        </div>

        <div className={styles.booking}>
          <span className={styles.bookingLabel}>Ближайшее время</span>

          <span className={styles.bookingTime}>
            {organization.nextAvailable}
          </span>

          <Link
            to={`/organizations/${organization.id}`}
            className={styles.bookingButton}
          >
            Записаться
          </Link>
        </div>
      </div>
    </article>
  );
}
