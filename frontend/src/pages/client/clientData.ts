import { localDate } from '../booking/bookingState'

export interface ClientBooking {
  id: string
  organization: string
  service: string
  specialist: string
  date: string
  time: string
  price: number | null
  address?: string
  duration?: number
  status: 'confirmed' | 'cancelled'
}
export interface ClientProfile { name: string; email: string; phone: string }
export function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

export function isUpcoming(booking: ClientBooking, now = new Date()) {
  return booking.status !== 'cancelled' && new Date(`${booking.date}T${booking.time}:00`) > now
}
export function splitBookings(bookings: ClientBooking[], now = new Date()) {
  const ordered = [...bookings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
  return { upcoming: ordered.filter(item => isUpcoming(item, now)), history: ordered.filter(item => !isUpcoming(item, now)).reverse() }
}
export function cancelBooking(bookings: ClientBooking[], id: string, now = new Date()) {
  return bookings.map(item => item.id === id && isUpcoming(item, now) ? { ...item, status: 'cancelled' as const } : item)
}
export function rescheduleBooking(bookings: ClientBooking[], id: string, date: string, time: string, now = new Date()) {
  const parsed = new Date(`${date}T${time}:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isFinite(parsed.getTime()) || localDate(parsed) !== date || parsed <= now) return bookings
  return bookings.map(item => item.id === id && isUpcoming(item, now) ? { ...item, date, time } : item)
}
export function validateProfile(profile: ClientProfile): Partial<Record<keyof ClientProfile, string>> {
  const errors: Partial<Record<keyof ClientProfile, string>> = {}
  if (!profile.name.trim() || profile.name.trim().length > 100) errors.name = 'Введите имя длиной до 100 символов.'
  if (profile.phone && (profile.phone.length > 32 || !/^\+?[\d\s().-]+$/.test(profile.phone) || profile.phone.replace(/\D/g, '').length < 10 || profile.phone.replace(/\D/g, '').length > 15)) errors.phone = 'Введите телефон из 10–15 цифр.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Некорректный email.'
  return errors
}
export async function loadDemoBookings(): Promise<ClientBooking[]> {
  const date = (offset: number) => { const day = new Date(); day.setDate(day.getDate() + offset); return localDate(day) }
  return [
    { id: 'demo-1', organization: 'Студия красоты «Лайм»', service: 'Маникюр с покрытием', specialist: 'Анна Смирнова', date: date(7), time: '11:00', price: 2000, address: 'г. Томск, ул. Тверская, 12', duration: 60, status: 'confirmed' },
    { id: 'demo-2', organization: 'Студия массажа «Баланс»', service: 'Массаж спины', specialist: 'Ольга Соколова', date: date(14), time: '15:00', price: 1200, address: 'г. Томск, пр. Ленина, 45', duration: 30, status: 'confirmed' },
    { id: 'demo-3', organization: 'Студия красоты «Пион»', service: 'Женская стрижка', specialist: 'Елена Морозова', date: date(-14), time: '12:00', price: 1200, address: 'г. Томск, ул. Учебная, 12', duration: 60, status: 'confirmed' },
  ]
}
