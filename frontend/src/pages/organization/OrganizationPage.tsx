import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { organizationService } from "../../services/organizationService";
import type { Organization } from "../../types/organization";
import styles from "./OrganizationPage.module.css";
import { ServiceCard } from "../../components/ui/ServiceCard/ServiceCard";

export function OrganizationPage() {
  const { id } = useParams<{ id: string }>();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      setLoading(true);
      setOrganization(null);

      const organizationId = Number(id);

      try {
        const data =
          Number.isSafeInteger(organizationId) && organizationId > 0
            ? await organizationService.getById(organizationId)
            : null;

        if (!cancelled) {
          setOrganization(data);
        }
      } catch {
        if (!cancelled) {
          setOrganization(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className={styles.page}>Загрузка организации...</main>;
  }

  if (!organization) {
    return <main className={styles.page}>Организация не найдена</main>;
  }

  return (
    <main>
      <section className={styles.organizationInfo}>
        <div
          className={styles.organizationBanner}
          style={{ backgroundColor: organization.background }}
        >
          <span className={styles.category}>{organization.category}</span>

          <h1>{organization.shortName}</h1>

          <p>{organization.description}</p>
        </div>

        <div className={styles.organizationAddress}>
          <h2>{organization.address}</h2>
          <p>{organization.workingHours}</p>

          <Button className={styles.bookingButton}>Записаться онлайн →</Button>
        </div>
      </section>
      <section className={styles.servicesSection}>
        <h2>Услуги и цены</h2>

        <div className={styles.servicesList}>
          {organization.services.length > 0 ? (
            organization.services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                organizationId={organization.id}
              />
            ))
          ) : (
            <p>У этой организации пока нет доступных услуг.</p>
          )}
        </div>
      </section>
    </main>
  );
}
