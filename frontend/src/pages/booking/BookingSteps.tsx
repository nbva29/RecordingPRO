import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button/Button'
import { getAvailableTimes, specialists } from './bookingData'
import { localDate } from './bookingState'
import styles from './Booking.module.css'

export function SpecialistStep({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return <><h2>Выберите мастера</h2><div className={styles.specialists}>
    {specialists.map(person => <button type="button" key={person.id} className={`${styles.specialist} ${selected === person.id ? styles.selected : ''}`} aria-pressed={selected === person.id} onClick={() => onSelect(person.id)}>
      <span className={styles.avatar} aria-hidden="true"><span /></span><span><strong>{person.name}</strong><small>{person.specialty}</small></span><span className={styles.check} aria-hidden="true" />
    </button>)}
  </div></>
}

export function DateTimeStep({ specialistId, date, time, onDate, onTime, onNext, canNext }: { specialistId: string; date: string; time: string; onDate: (date: string) => void; onTime: (time: string) => void; onNext: () => void; canNext: boolean }) {
  const [today] = useState(() => localDate(new Date()))
  const [month, setMonth] = useState(() => { const d = date && date >= today ? new Date(`${date}T00:00:00`) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const slots = useQuery({ queryKey: ['demo-booking-slots', specialistId, date], queryFn: () => getAvailableTimes(specialistId, date), enabled: !!specialistId && !!date, retry: false })
  const offset = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const currentMonth = new Date(`${today.slice(0, 7)}-01T00:00:00`)
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(month)
  const selectedDate = date ? new Date(`${date}T00:00:00`) : null
  const weekday = selectedDate ? new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(selectedDate) : ''
  const dateLabel = selectedDate ? `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(selectedDate)} · ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}` : 'Выберите дату в календаре'
  return <div className={styles.dateLayout}>
    <section className={`${styles.panel} ${styles.calendar}`}><div className={styles.month}><strong>{monthLabel} {month.getFullYear()}</strong><div><button type="button" aria-label="Предыдущий месяц" disabled={month <= currentMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><button type="button" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div></div>
      <div className={styles.grid}>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span className={styles.weekday} key={d}>{d}</span>)}{Array.from({ length: offset }, (_, i) => <span className={styles.emptyDay} key={`empty${i}`} />)}{Array.from({ length: days }, (_, i) => { const value = localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)); return <button type="button" key={value} disabled={value < today} aria-label={new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`))} aria-pressed={date === value} className={date === value ? styles.activeDay : ''} onClick={() => onDate(value)}><span>{i + 1}</span></button> })}</div>
    </section><section className={`${styles.panel} ${styles.times}`}><h2>Свободное время</h2><p className={styles.dateCaption}>{dateLabel}</p>{!date ? null : slots.isPending ? <p role="status">Загружаем время…</p> : slots.isError ? <div role="alert"><p>Не удалось загрузить время.</p><Button variant="secondary" onClick={() => slots.refetch()}>Повторить</Button></div> : slots.data.length === 0 ? <p>На эту дату свободного времени нет. Выберите другую дату.</p> : <div className={styles.timeGrid}>{slots.data.map(slot => <button type="button" key={slot} aria-pressed={time === slot} className={time === slot ? styles.activeTime : ''} onClick={() => onTime(slot)}>{slot}</button>)}</div>}
      <Button className={styles.timeNext} disabled={!canNext} onClick={onNext}>Подтвердить выбор</Button>
    </section>
  </div>
}
