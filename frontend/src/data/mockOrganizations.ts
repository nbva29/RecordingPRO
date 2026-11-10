import type { Organization } from "../types/organization";

export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "Студия красоты «Лайм»",
    shortName: "Лайм",
    category: "Маникюр",
    description: "Маникюр · Ресницы · Брови",
    address: "Томск, пр. Ленина, 32",
    city: "Томск",
    workingHours: "Ежедневно · 09:00–21:00",
    background: "#D9EFE7",
    services: [
      {
        id: 1,
        name: "Маникюр с покрытием",
        duration: 90,
        price: 1500,
      },
      {
        id: 2,
        name: "Классический маникюр",
        duration: 45,
        price: 900,
      },
    ],
    nextAvailable: "20 октября, 13:30",
  },
  {
    id: 2,
    name: "Барбершоп «Форма»",
    shortName: "Форма",
    category: "Стрижка",
    description: "Стрижки · Борода · Укладки",
    address: "Томск, ул. Арбат, 24",
    city: "Томск",
    workingHours: "Ежедневно · 10:00–20:00",
    background: "#DDE9F7",
    services: [
      {
        id: 5,
        name: "Мужская стрижка",
        duration: 60,
        price: 1800,
      },
      {
        id: 6,
        name: "Стрижка + борода",
        duration: 90,
        price: 2500,
      },
    ],
    nextAvailable: "20 октября, 14:00",
  },
];
