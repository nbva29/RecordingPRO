import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { Heading } from "../../components/ui/Heading/Heading";
import styles from "./HomePage.module.css";
import { CategoryCard } from "../../components/ui/CategoryCard/CategoryCard";

import { OrganizationCard } from "../../components/ui/OrganizationCard/OrganizationCard";

export function HomePage() {
  const navigate = useNavigate();

  const [service, setService] = useState("");
  const [city, setCity] = useState("Томск");

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
  const categories = [
    "Парикмахерские",
    "Маникюр",
    "Косметология",
    "Массаж",
    "Барбершопы",
  ];

  const organizations = [
    {
      id: 1,
      shortName: "ЛАЙМ",
      name: "Студия красоты «Лайм»",
      description: "Маникюр · Брови · Ресницы",
      price: 900,
      background: "#D9EFE7",
    },
    {
      id: 2,
      shortName: "ФОРМА",
      name: "Барбершоп «Форма»",
      description: "Стрижки · Борода · Укладки",
      price: 1200,
      background: "#DDE9F7",
    },
    {
      id: 3,
      shortName: "БАЛАНС",
      name: "Массажная студия «Баланс»",
      description: "Массаж · Уход за телом",
      price: 1600,
      background: "#F5E6D9",
    },
  ];
  return (
    <main className={styles.home}>
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
          <label htmlFor="service">УСЛУГА</label>
          <input
            id="service"
            type="text"
            placeholder="Маникюр, стрижка, массаж..."
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
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" className={styles.searchButton}>
          Найти организации →
        </Button>
      </form>
      <section className={styles.categories}>
        <h2>Популярные категории</h2>

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
        <h2>Организации рядом</h2>

        <div className={styles.organizationGrid}>
          {organizations.map((organization) => (
            <OrganizationCard key={organization.id} {...organization} />
          ))}
        </div>
      </section>
    </main>
  );
}
