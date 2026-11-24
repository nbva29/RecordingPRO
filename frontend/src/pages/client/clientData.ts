export interface ClientBooking {
  id: string;
  organization: string;
  service: string;
  specialist: string;
  specialistId?: number;
  serviceId?: number;
  date: string;
  time: string;
  address?: string;
  duration?: number;
  status: "created" | "confirmed" | "completed" | "cancelled";
}
export interface ClientProfile {
  name: string;
  email: string;
  phone: string;
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
export function isUpcoming(booking: ClientBooking, now = new Date()) {
  return (
    (booking.status === "created" || booking.status === "confirmed") &&
    new Date(`${booking.date}T${booking.time}:00`) > now
  );
}
export function splitBookings(bookings: ClientBooking[], now = new Date()) {
  const ordered = [...bookings].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  return {
    upcoming: ordered.filter((item) => isUpcoming(item, now)),
    history: ordered.filter((item) => !isUpcoming(item, now)).reverse(),
  };
}
export function validateProfile(
  profile: ClientProfile,
): Partial<Record<keyof ClientProfile, string>> {
  const errors: Partial<Record<keyof ClientProfile, string>> = {};
  if (profile.name.trim().length > 100)
    errors.name = "Имя должно содержать не более 100 символов.";
  if (profile.phone.trim().length > 32)
    errors.phone = "Телефон должен содержать не более 32 символов.";
  return errors;
}
