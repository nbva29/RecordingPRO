import { localDate } from "../booking/bookingState";

export interface AdminService {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  discountPercent: number;
  online: boolean;
  address?: string;
  specialist?: string;
  showOldPrice?: boolean;
  oldPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  options?: AdminOption[];
}
export interface AdminOption {
  id: number;
  name: string;
  price: number;
}
export interface PriceDetails {
  discountPercent: number;
  oldPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}
export interface OptionDraft {
  id: number;
  name: string;
  price: string;
}
export function parseOptions(drafts: OptionDraft[]): AdminOption[] | null {
  const result = drafts.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    price: item.price.trim() ? Number(item.price) : NaN,
  }));
  return result.every(
    (item) =>
      item.name.length > 0 &&
      item.name.length <= 150 &&
      Number.isInteger(item.price) &&
      item.price >= 0 &&
      item.price <= 10_000_000,
  )
    ? result
    : null;
}
export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  service: string;
  specialist: string;
  client: string;
  phone: string | null;
  email: string | null;
  status: "confirmed" | "cancelled" | "completed";
}
export interface AdminData {
  organization: string;
  categories: { id: number; name: string }[];
  services: AdminService[];
  appointments: AdminAppointment[];
}
export const appointmentStatus = {
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена",
} as const;

export function validateService(
  service: AdminService,
): Partial<Record<keyof AdminService, string>> {
  const errors: Partial<Record<keyof AdminService, string>> = {};
  if (!service.name.trim() || service.name.trim().length > 150)
    errors.name = "Введите название до 150 символов.";
  if (!Number.isInteger(service.categoryId) || service.categoryId <= 0)
    errors.categoryId = "Выберите категорию.";
  if (service.description.length > 2000)
    errors.description = "Описание не должно превышать 2000 символов.";
  if (
    !Number.isInteger(service.price) ||
    service.price < 0 ||
    service.price > 10_000_000
  )
    errors.price = "Укажите целую цену от 0 до 10 000 000 ₽.";
  if (
    !Number.isInteger(service.duration) ||
    service.duration <= 0 ||
    service.duration > 1440
  )
    errors.duration = "Укажите длительность от 1 до 1440 минут.";
  if (
    !Number.isInteger(service.discountPercent) ||
    service.discountPercent < 0 ||
    service.discountPercent > 100
  )
    errors.discountPercent = "Укажите скидку от 0 до 100%.";
  return errors;
}
export function upsertService(
  services: AdminService[],
  service: AdminService,
): AdminService[] {
  if (Object.keys(validateService(service)).length) return services;
  const saved = {
    ...service,
    name: service.name.trim(),
    description: service.description.trim(),
  };
  return services.some((item) => item.id === saved.id)
    ? services.map((item) => (item.id === saved.id ? saved : item))
    : [...services, saved];
}
export function removeService(
  services: AdminService[],
  id: number,
): AdminService[] {
  return services.filter((item) => item.id !== id);
}
export function changePrice(
  services: AdminService[],
  id: number,
  price: number,
  options?: AdminOption[],
  details?: PriceDetails,
): AdminService[] {
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000)
    return services;
  if (
    details &&
    (!Number.isInteger(details.discountPercent) ||
      details.discountPercent < 0 ||
      details.discountPercent > 100 ||
      [details.oldPrice, details.minPrice, details.maxPrice].some(
        (value) =>
          value !== null &&
          (!Number.isInteger(value) || value < 0 || value > 10_000_000),
      ))
  )
    return services;
  return services.map((item) =>
    item.id === id
      ? { ...item, price, ...(options ? { options } : {}), ...(details ?? {}) }
      : item,
  );
}
export function appointmentsForDate<T extends { date: string }>(
  appointments: T[],
  date: string,
): T[] {
  return appointments.filter((item) => item.date === date);
}
export function formatAdminDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
export async function loadAdminDemo(): Promise<AdminData> {
  const date = (offset: number) => {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    return localDate(day);
  };
  return {
    organization: "Студия красоты «Лайм»",
    categories: [
      { id: 1, name: "Маникюр" },
      { id: 2, name: "Уход" },
    ],
    services: [
      {
        id: 1,
        categoryId: 1,
        name: "Маникюр с покрытием",
        description: "Маникюр и покрытие",
        price: 2000,
        duration: 60,
        discountPercent: 0,
        online: true,
        options: [
          { id: 1, name: "Снятие покрытия", price: 300 },
          { id: 2, name: "Дизайн одного ногтя", price: 100 },
        ],
      },
      {
        id: 2,
        categoryId: 1,
        name: "Маникюр без покрытия",
        description: "",
        price: 1200,
        duration: 45,
        discountPercent: 0,
        online: true,
      },
      {
        id: 3,
        categoryId: 2,
        name: "Уход за руками",
        description: "Уходовая процедура",
        price: 800,
        duration: 30,
        discountPercent: 0,
        online: true,
      },
    ],
    appointments: [
      {
        id: "a1",
        date: date(0),
        time: "10:00",
        service: "Маникюр с покрытием",
        specialist: "Анна Смирнова",
        client: "Екатерина Иванова",
        phone: "+7 (999) 111-22-33",
        email: "client@example.com",
        status: "confirmed",
      },
      {
        id: "a2",
        date: date(0),
        time: "14:00",
        service: "Уход за руками",
        specialist: "Мария Кузнецова",
        client: "Ольга Петрова",
        phone: "+7 (999) 222-33-44",
        email: null,
        status: "confirmed",
      },
      {
        id: "a3",
        date: date(1),
        time: "12:00",
        service: "Маникюр без покрытия",
        specialist: "Анна Смирнова",
        client: "Ирина Соколова",
        phone: null,
        email: "client2@example.com",
        status: "confirmed",
      },
      {
        id: "a4",
        date: date(-1),
        time: "11:00",
        service: "Уход за руками",
        specialist: "Мария Кузнецова",
        client: "Алексей Орлов",
        phone: null,
        email: null,
        status: "completed",
      },
    ],
  };
}
