export interface Specialist { id: string; name: string; specialty: string }
// Demonstration data is isolated here so it can be replaced by the N6 API.
export const specialists: Specialist[] = [
  { id: 'anna', name: 'Анна Смирнова', specialty: 'Мастер · Опыт 5 лет' },
  { id: 'maria', name: 'Мария Кузнецова', specialty: 'Мастер · Опыт 3 года' },
  { id: 'any', name: 'Любой свободный мастер', specialty: 'Подберём специалиста' },
]
export async function getAvailableTimes(_specialistId: string, date: string): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 250))
  const day = new Date(`${date}T00:00:00`).getDay()
  if (day === 0) return []
  const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']
  const now = new Date()
  return times.filter(time => new Date(`${date}T${time}:00`) > now)
}

