import type { SearchOrganization } from "../components/search/SearchOrganizationCard/SearchOrganizationCard";

export const mockOrganizations: SearchOrganization[] = [
  {
    id: 1,
    name: "Студия красоты «Лайм»",
    category: "Маникюр",
    description: "Уютная студия красоты",
    address: "Томск, ул. Тверская, 12",
    background: "#F5E6D9",
    services: [
      { name: "Маникюр с покрытием", price: 2000 },
      { name: "Снятие покрытия", price: 1500 },
    ],
    nextAvailable: "20 окт., 13:30",
  },
  {
    id: 2,
    name: "Барбершоп «Форма»",
    category: "Стрижка",
    description: "Мужские стрижки и уход за бородой",
    address: "Томск, ул. Арбат, 24",
    background: "#DDE9F7",
    services: [
      { name: "Мужская стрижка", price: 1800 },
      { name: "Стрижка + борода", price: 2500 },
    ],
    nextAvailable: "20 окт., 16:00",
  },
  {
    id: 3,
    name: "Студия бровей «Взгляд»",
    category: "Брови",
    description: "Профессиональное оформление бровей",
    address: "Томск, ул. Малышева, 8",
    background: "#F5E6D9",
    services: [
      { name: "Оформление бровей", price: 1200 },
      { name: "Окрашивание бровей", price: 1500 },
    ],
    nextAvailable: "21 окт., 11:00",
  },
  {
    id: 4,
    name: "Салон «Гармония»",
    category: "Массаж",
    description: "Расслабляющий и лечебный массаж",
    address: "Томск, ул. Пирогова, 17",
    background: "#D9EFE7",
    services: [
      { name: "Классический массаж", price: 2500 },
      { name: "Антистресс-массаж", price: 2800 },
    ],
    nextAvailable: "22 окт., 15:30",
  },
];
