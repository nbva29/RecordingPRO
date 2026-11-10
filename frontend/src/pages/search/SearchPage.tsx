import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { Heading } from "../../components/ui/Heading/Heading";
import { SearchOrganizationCard } from "../../components/ui/SearchOrganizationCard/SearchOrganizationCard";
import { mockOrganizations } from "../../data/mockOrganizations";
import styles from "./SearchPage.module.css";

const categories = [
  "Все категории",
  "Маникюр",
  "Стрижка",
  "Брови",
  "Массаж",
  "Косметология",
  "Эпиляция",
  "Другое",
];

const normalizeText = (text: string) =>
  text
    .toLocaleLowerCase("ru-RU")
    .replace(/[«»"'.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("service") ?? "");

  const [city, setCity] = useState(searchParams.get("city") ?? "Томск");

  useEffect(() => {
    setSearch(searchParams.get("service") ?? "");
    setCity(searchParams.get("city") ?? "Томск");
  }, [searchParams]);

  const selectedCategory = searchParams.get("category") ?? "Все категории";

  const selectedService = normalizeText(searchParams.get("service") ?? "");

  const selectedCity = normalizeText(searchParams.get("city") ?? "");

  const filteredOrganizations = mockOrganizations.filter((organization) => {
    const matchesCategory =
      selectedCategory === "Все категории" ||
      organization.category === selectedCategory;

    const searchableText = normalizeText(
      [
        organization.name,
        organization.description,
        organization.category,
        ...organization.services.map((service) => service.name),
      ].join(" "),
    );

    const matchesService =
      !selectedService || searchableText.includes(selectedService);

    const matchesCity =
      !selectedCity ||
      normalizeText(organization.address).includes(selectedCity);

    return matchesCategory && matchesService && matchesCity;
  });

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

  const handleCategory = (category: string) => {
    const params = new URLSearchParams(searchParams);

    if (category === "Все категории") {
      params.delete("category");
    } else {
      params.set("category", category);
    }

    setSearchParams(params);
  };

  return (
    <main className={styles.searchPage}>
      <Heading title="Найти услугу" />

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <div className={styles.searchFields}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Название услуги, организации или специалиста"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className={styles.cityField}>
            <input
              className={styles.cityInput}
              type="text"
              aria-label="Город"
              placeholder="Город"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className={styles.searchButton}>
          Найти
        </Button>
      </form>

      <div className={styles.categories}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={[
              styles.category,
              selectedCategory === category ? styles.active : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className={styles.results}>
        {filteredOrganizations.length > 0 ? (
          filteredOrganizations.map((organization) => (
            <SearchOrganizationCard
              key={organization.id}
              organization={organization}
            />
          ))
        ) : (
          <p className={styles.empty}>
            По вашему запросу организации не найдены
          </p>
        )}
      </div>
    </main>
  );
}
