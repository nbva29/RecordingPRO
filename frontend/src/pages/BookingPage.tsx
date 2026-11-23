import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button/Button'
import { RequestError } from '../components/ui/RequestError'
import { useOrganization } from '../hooks/useCatalog'
import type { Organization, Service } from '../types/organization'
import { DateTimeStep, SpecialistStep } from './booking/BookingSteps'
import { getAvailableTimes, specialists } from './booking/bookingData'
import { canContinue, initialBooking, localDate, selectDate, selectSpecialist } from './booking/bookingState'
import type { BookingState } from './booking/bookingState'
import styles from './booking/Booking.module.css'

function readSaved(key: string): BookingState {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (!saved || !specialists.some(person => person.id === saved.specialistId)) return initialBooking
    const date = typeof saved.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.date) && saved.date >= localDate(new Date()) ? saved.date : ''
    const validDate = date && !Number.isNaN(new Date(date + 'T00:00:00').getTime()) && localDate(new Date(date + 'T00:00:00')) === date ? date : ''
    const time = validDate && typeof saved.time === 'string' && /^\d{2}:\d{2}$/.test(saved.time) ? saved.time : ''
    return { specialistId: saved.specialistId, date: validDate, time, step: Math.min(Number.isInteger(saved.step) ? Math.max(saved.step, 0) : 0, time ? 2 : 1) }
  } catch { return initialBooking }
}

function BookingWizard({ organization, service }: { organization: Organization; service: Service }) {
  const key = `booking-demo:${organization.id}:${service.id}`
  const [state, setState] = useState<BookingState>(() => readSaved(key))
  const [confirmed, setConfirmed] = useState(false)
  const [contact, setContact] = useState({ name: '', phone: '', email: '' })
  const [today] = useState(() => localDate(new Date()))
  const slots = useQuery({ queryKey: ['demo-booking-slots', state.specialistId, state.date], queryFn: () => getAvailableTimes(state.specialistId, state.date), enabled: !!state.specialistId && !!state.date, retry: false })
  const timeValid = !!state.time && !!slots.data?.includes(state.time) && state.date >= today
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* Storage may be unavailable. */ } }, [key, state])
  const specialist = specialists.find(person => person.id === state.specialistId)
  const step = state.step === 2 && slots.isSuccess && !timeValid ? 1 : state.step
  const goNext = () => setState(previous => ({ ...previous, step: step + 1 }))
  const title = ['Онлайн-запись', 'Выберите дату и время', 'Подтверждение записи'][step]
  const subtitle = ['Выберите услугу, мастера, дату и удобное свободное время', 'Свободные интервалы для выбранной услуги и специалиста', 'Остался последний шаг — проверьте данные и оставьте контакты'][step]
  const price = service.price != null ? `${service.price.toLocaleString('ru-RU')} ₽` : 'Не указана'
  const formattedDate = state.date ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${state.date}T00:00:00`)) : ''
  return <>
    <h1>{title}</h1><p className={styles.intro}>{subtitle}</p>
    <div className={styles.stepSpacing} />
    {step === 0 && <div className={styles.layout}>
      <section className={`${styles.panel} ${styles.mainPanel}`}>
        <SpecialistStep selected={state.specialistId} onSelect={id => setState(previous => selectSpecialist(previous, id))} />
        <div className={styles.specialistFooter}>
          <p className={styles.helper}>Доступно время после выбора мастера</p>
          <Button disabled={!canContinue(state)} onClick={goNext}>Продолжить →</Button>
        </div>
      </section>
      <aside className={`${styles.panel} ${styles.bookingSummary}`}><h2>Ваше бронирование</h2><h3>{organization.name}</h3><div className={styles.overviewRow}><small>Услуга</small><span>{service.name}</span></div><div className={styles.overviewRow}><small>Продолжительность</small><span>{service.duration} минут</span></div><div className={styles.total}>Итого <span>{price}</span></div></aside>
    </div>}
    {step === 1 && <DateTimeStep specialistId={state.specialistId} date={state.date} time={state.time} onDate={date => setState(previous => ({ ...selectDate(previous, date), step: 1 }))} onTime={time => setState(previous => ({ ...previous, time, step: 1 }))} onNext={goNext} canNext={canContinue({ ...state, step }) && timeValid} />}
    {step === 2 && <div className={styles.layout}>
      <form className={`${styles.panel} ${styles.mainPanel}`} onSubmit={event => { event.preventDefault(); if (timeValid) setConfirmed(true) }}><h2>Контактные данные</h2>
        <div className={styles.contactFields}>
          <label>Имя и фамилия<input required autoComplete="name" value={contact.name} onChange={event => setContact(previous => ({ ...previous, name: event.target.value }))} placeholder="Екатерина Иванова" /></label>
          <label>Телефон<input required type="tel" autoComplete="tel" value={contact.phone} onChange={event => setContact(previous => ({ ...previous, phone: event.target.value }))} placeholder="+7 (999) 123-45-67" /></label>
          <label>Email<input required type="email" autoComplete="email" value={contact.email} onChange={event => setContact(previous => ({ ...previous, email: event.target.value }))} placeholder="example@mail.ru" /></label>
        </div>
        <label className={styles.consent}><input type="checkbox" required /> Я согласен(на) с условиями обработки данных</label>
        <div className={`${styles.actions} ${styles.confirmationActions}`}><Button type="submit" disabled={!timeValid}>Подтвердить запись →</Button></div>
        {!timeValid && <p role="alert">Выбранное время недоступно или ещё проверяется.</p>}
      </form>
      <aside><section className={`${styles.panel} ${styles.bookingSummary}`}><h2>Детали записи</h2><dl className={styles.summary}><div><dt>Организация</dt><dd>{organization.name}</dd></div><div><dt>Услуга</dt><dd>{service.name}</dd></div><div><dt>Мастер</dt><dd>{specialist?.name}</dd></div><div><dt>Дата и время</dt><dd>{formattedDate} · {state.time}</dd></div><div><dt>Стоимость</dt><dd>{price}</dd></div></dl></section>{confirmed && <div role="status" className={styles.notice}><strong>✓ Запись будет подтверждена</strong><p>После отправки вы получите уведомление</p></div>}</aside>
    </div>}
  </>
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const organizationId = /^\d+$/.test(id ?? '') && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null
  const query = useOrganization(organizationId)
  const serviceId = params.get('service')
  const service = query.data?.services.find(item => String(item.id) === serviceId)
  return <div id="booking-page" className={styles.page}>{organizationId === null ? <><h1>Онлайн-запись</h1><p>Организация не найдена.</p><Link to="/search">Найти организацию</Link></> : query.isPending ? <><h1>Онлайн-запись</h1><p role="status">Загружаем организацию…</p></> : query.isError ? <><h1>Онлайн-запись</h1><RequestError error={query.error} onRetry={query.refetch} /></> : !query.data || !service ? <><h1>Онлайн-запись</h1><p>Выберите услугу на странице организации.</p><Link to={`/organizations/${organizationId}`}>Перейти к услугам</Link></> : <BookingWizard key={`${organizationId}:${service.id}`} organization={query.data} service={service} />}</div>
}


