import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { useOrganization } from "../../hooks/useCatalog";
import { ApiError } from "../../api/httpClient";
import { RequestError } from "../../components/ui/RequestError";
import styles from "./OrganizationPage.module.css";
import { ServiceCard } from "../../components/ui/ServiceCard/ServiceCard";

export function OrganizationPage() {
  const { id } = useParams<{ id: string }>();

  const parsedId = Number(id);
  const organizationId = /^\d+$/.test(id ?? "") && Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const query = useOrganization(organizationId);
  const organization = query.data;

  if (organizationId === null || (query.error instanceof ApiError && query.error.status === 404)) {
    return <main className={styles.page}>Организация не найдена</main>;
  }
  if (query.isPending) {
    return <main className={styles.page}>Загрузка организации...</main>;
  }

  if (query.isError) {
    return <main className={styles.page}><RequestError error={query.error} onRetry={query.refetch} /></main>;
  }
  if (!organization) return null;

  return (
    <main>
      <section className={styles.organizationInfo}>
        <div
          className={styles.organizationBanner}
          style={{ backgroundColor: organization.background }}
        >
          {organization.categories?.length ? <span className={styles.category}>{organization.categories.map(({ name }) => name).join(" · ")}</span> : null}

          <h1>{organization.name}</h1>

          {organization.description && <p>{organization.description}</p>}
        </div>

        <div className={styles.organizationAddress}>
          <h2>{organization.address}</h2>
          <p>{organization.city}</p>

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
