import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { Heading } from "../../components/ui/Heading/Heading";
import styles from "./HomePage.module.css";
import { CategoryCard } from "../../components/ui/CategoryCard/CategoryCard";

import { OrganizationCard } from "../../components/ui/OrganizationCard/OrganizationCard";
import { useCatalogCategories, useOrganizations } from "../../hooks/useCatalog";
import { RequestError } from "../../components/ui/RequestError";

export function HomePage() {
  const navigate = useNavigate();

  const [service, setService] = useState("");
  const [city, setCity] = useState("Томск");
  const categoryQuery = useCatalogCategories();
  const organizationsQuery = useOrganizations({ city });
  const categories = categoryQuery.data ?? [];
  const organizations = (organizationsQuery.data ?? []).slice(0, 3);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (service.trim()) {
      params.set("service", service.trim());
    }

    if (city.trim()) {
      params.set("city", city.trim());
    }

    navigate(`/search?${params.toString()}`);
  };
  return (
    <main>
      <Heading
        title="Записывайтесь к лучшим специалистам"
        description="Находите услуги рядом с вами и бронируйте удобное время онлайн"
      />

      <form
        className={styles.searchPanel}
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <div className={styles.field}>
          <label htmlFor="service">ОРГАНИЗАЦИЯ</label>
          <input
            id="service"
            type="text"
            placeholder="Название организации"
            maxLength={150}
            value={service}
            onChange={(event) => setService(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="city">ГОРОД</label>
          <input
            id="city"
            type="text"
            placeholder="Томск"
            maxLength={100}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" className={styles.searchButton}>
          Найти организации →
        </Button>
      </form>
      <section className={styles.categories}>
        {categoryQuery.isPending && <p role="status">Загрузка категорий...</p>}
        {categoryQuery.isError && (
          <RequestError
            error={categoryQuery.error}
            onRetry={categoryQuery.refetch}
          />
        )}
        {categoryQuery.isSuccess && categories.length === 0 && (
          <p>Категорий пока нет.</p>
        )}

        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <CategoryCard
              key={category}
              title={category}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("category", category);
                navigate(`/search?${params.toString()}`);
              }}
            />
          ))}
        </div>
      </section>
      <section className={styles.organizations}>
        {organizationsQuery.isPending && (
          <p role="status">Загрузка организаций...</p>
        )}
        {organizationsQuery.isError && (
          <RequestError
            error={organizationsQuery.error}
            onRetry={organizationsQuery.refetch}
          />
        )}
        {organizationsQuery.isSuccess && organizations.length === 0 && (
          <p>Организации не найдены.</p>
        )}

        <div className={styles.organizationGrid}>
          {!organizationsQuery.isError &&
            organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                {...organization}
                price={
                  organization.services.length
                    ? Math.min(
                        ...organization.services.map(({ price }) => price),
                      )
                    : undefined
                }
              />
            ))}
        </div>
      </section>
    </main>
  );
}
