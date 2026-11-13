import { Link } from "react-router-dom";
import styles from "./SearchOrganizationCard.module.css";
import type { Organization } from "../../../types/organization";

export type SearchOrganization = Organization;

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
            {organization.categories?.length ? <span className={styles.category}>{organization.categories.map(({ name }) => name).join(" · ")}</span> : null}
          </div>

          {organization.description && <p className={styles.description}>{organization.description}</p>}

          <p className={styles.address}>{organization.city} · {organization.address}</p>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.services}>
          {organization.services.map((service) => (
            <div key={service.id} className={styles.service}>
              <span>{service.name}</span>
              <strong>{service.price.toLocaleString("ru-RU")} ₽</strong>
            </div>
          ))}
          {organization.services.length === 0 && <p>У этой организации пока нет доступных услуг.</p>}
        </div>

        <div className={styles.booking}>
          {organization.phone?.trim() && (
            <>
              <span className={styles.bookingLabel}>Телефон</span>
              <span className={styles.bookingPhone}>{organization.phone}</span>
            </>
          )}
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
