import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SetURLSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { Heading } from "../../components/ui/Heading/Heading";
import { SearchOrganizationCard } from "../../components/ui/SearchOrganizationCard/SearchOrganizationCard";
import { useCatalogCategories, useOrganizations } from "../../hooks/useCatalog";
import { RequestError } from "../../components/ui/RequestError";
import styles from "./SearchPage.module.css";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  return <SearchPageContent key={searchParams.toString()} searchParams={searchParams} setSearchParams={setSearchParams} />;
}

function SearchPageContent({ searchParams, setSearchParams }: {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) {

  const [search, setSearch] = useState(searchParams.get("service") ?? "");

  const [city, setCity] = useState(searchParams.get("city") ?? "");

  const selectedCategory = searchParams.get("category");

  const categoryQuery = useCatalogCategories();
  const categories: { value: string | null; label: string }[] = [
    { value: null, label: "Все категории" },
    ...(categoryQuery.data ?? []).map((name) => ({ value: name, label: name })),
  ];
  const organizationsQuery = useOrganizations({
    search: searchParams.get("service") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    category: selectedCategory ?? undefined,
  });
  const filteredOrganizations = organizationsQuery.data ?? [];
  const hasFilters = ["service", "city", "category"].some((key) => searchParams.get(key)?.trim());

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams);

    if (search.trim()) {
      params.set("service", search.trim());
    } else {
      params.delete("service");
    }

    if (city.trim()) {
      params.set("city", city.trim());
    } else {
      params.delete("city");
    }

    setSearchParams(params);
  };

  const handleCategory = (category: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (category === null) {
      params.delete("category");
    } else {
      params.set("category", category);
    }

    setSearchParams(params);
  };

  return (
    <main className={styles.searchPage}>
      <Heading title="Найти организацию" />

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <div className={styles.searchFields}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Название организации"
            aria-label="Название организации"
            maxLength={150}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className={styles.cityField}>
            <input
              className={styles.cityInput}
              type="text"
              aria-label="Город"
              placeholder="Город"
              maxLength={100}
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className={styles.searchButton}>
          Найти
        </Button>
      </form>

      {categoryQuery.isPending && <p role="status">Загрузка категорий...</p>}
      {categoryQuery.isError && <RequestError error={categoryQuery.error} onRetry={categoryQuery.refetch} />}
      <div className={styles.categories}>
        {categories.map((category) => (
          <button
            key={category.value === null ? "all" : `category:${category.value}`}
            type="button"
            className={[
              styles.category,
              selectedCategory === category.value ? styles.active : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selectedCategory === category.value}
            onClick={() => handleCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className={styles.results}>
        {organizationsQuery.isPending ? <p role="status">Загрузка организаций...</p> :
        organizationsQuery.isError ? <RequestError error={organizationsQuery.error} onRetry={organizationsQuery.refetch} /> :
        filteredOrganizations.length > 0 ? (
          filteredOrganizations.map((organization) => (
            <SearchOrganizationCard
              key={organization.id}
              organization={organization}
            />
          ))
        ) : (
          <p className={styles.empty}>
            {hasFilters ? "По вашему запросу организации не найдены" : "В каталоге пока нет организаций"}
          </p>
        )}
      </div>
    </main>
  );
}
