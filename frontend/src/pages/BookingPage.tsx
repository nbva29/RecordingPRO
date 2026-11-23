import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { bookingApi } from '../api/bookingApi'
import { authApi } from '../api/authApi'
import { ApiError } from '../api/httpClient'
import { getSessionToken, useAuthSession } from '../auth/authSession'
import { Button } from '../components/ui/Button/Button'
import { RequestError } from '../components/ui/RequestError'
import { useOrganization } from '../hooks/useCatalog'
import type { Organization, Service } from '../types/organization'
import { DateTimeStep, SpecialistStep } from './booking/BookingSteps'
import { canContinue, initialBooking, localDate, selectDate, selectSpecialist } from './booking/bookingState'
import type { BookingState } from './booking/bookingState'
import styles from './booking/Booking.module.css'

function readSaved(key: string): BookingState {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (!saved || !/^[1-9]\d*$/.test(saved.specialistId)) return initialBooking
    const date = typeof saved.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.date) && saved.date >= localDate(new Date()) ? saved.date : ''
    const validDate = date && !Number.isNaN(new Date(date + 'T00:00:00').getTime()) && localDate(new Date(date + 'T00:00:00')) === date ? date : ''
    const time = validDate && typeof saved.time === 'string' && /^\d{2}:\d{2}(:00)?$/.test(saved.time) ? saved.time : ''
    return { specialistId: saved.specialistId, date: validDate, time, step: Math.min(Number.isInteger(saved.step) ? Math.max(saved.step, 0) : 0, time ? 2 : 1) }
  } catch { return initialBooking }
}

function BookingWizard({ organization, service }: { organization: Organization; service: Service }) {
  const key = `booking:${organization.id}:${service.id}`
  const [state, setState] = useState<BookingState>(() => readSaved(key))
  const [conflict, setConflict] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null)
  const [profileError, setProfileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [today] = useState(() => localDate(new Date()))
  const submitLock = useRef(false)
  const queryClient = useQueryClient()
  const location = useLocation()
  const auth = useAuthSession()
  const specialistsQuery = useQuery({ queryKey: ['booking-specialists', service.id], queryFn: ({ signal }) => bookingApi.getSpecialists(service.id, signal), retry: false })
  const specialists = specialistsQuery.data?.filter(person => person.organization_id === organization.id && person.service_ids.includes(service.id)) ?? []
  const specialist = specialists.find(person => String(person.id) === state.specialistId)
  const slotsKey = ['booking-slots', state.specialistId, service.id, state.date] as const
  const slots = useQuery({ queryKey: slotsKey, queryFn: ({ signal }) => bookingApi.getSlots(Number(state.specialistId), service.id, state.date, signal), enabled: !!specialist && !!state.date, retry: false, staleTime: 0 })
  const priceQuery = useQuery({ queryKey: ['booking-price', service.id], queryFn: ({ signal }) => bookingApi.calculatePrice(service.id, [], signal), retry: false })
  const mutation = useMutation({ mutationFn: bookingApi.createAppointment, retry: false })
  const timeValid = !slots.isError && !!state.time && !!slots.data?.slots.some(slot => slot.start_time === state.time) && state.date >= today
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* Storage may be unavailable. */ } }, [key, state])
  const step = specialistsQuery.isSuccess && !specialist ? 0 : state.step === 2 && slots.isSuccess && !timeValid && !mutation.isSuccess ? 1 : state.step
  const title = ['Онлайн-запись', 'Выберите дату и время', 'Подтверждение записи'][step]
  const subtitle = ['Выберите услугу, мастера, дату и удобное свободное время', 'Свободные интервалы для выбранной услуги и специалиста', 'Остался последний шаг — проверьте данные и подтвердите запись'][step]
  const price = priceQuery.data ? `${priceQuery.data.total_price.toLocaleString('ru-RU')} ₽` : '—'
  const formattedDate = state.date ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${state.date}T00:00:00`)) : ''
  const name = contact?.name ?? auth.user?.name ?? ''
  const phone = contact?.phone ?? auth.user?.phone ?? ''
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current || !specialist || !timeValid || slots.isFetching || !priceQuery.isSuccess || auth.status !== 'authenticated' || !auth.user || mutation.isSuccess || uncertain) return
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) { setProfileError('Укажите имя и телефон.'); return }
    submitLock.current = true
    setSubmitting(true)
    setProfileError('')
    try {
      const token = getSessionToken()
      if (!token) { setProfileError('Сессия завершилась. Войдите снова.'); return }
      if (trimmedName !== (auth.user.name ?? '') || trimmedPhone !== (auth.user.phone ?? '')) {
        try {
          const user = await authApi.updateProfile(token, { name: trimmedName, phone: trimmedPhone })
          if (useAuthSession.getState().accessToken !== token) { setProfileError('Сессия завершилась. Войдите снова.'); return }
          useAuthSession.setState({ user })
        } catch (error) {
          setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить контактные данные.')
          return
        }
      }
      await mutation.mutateAsync({ specialist_id: specialist.id, service_id: service.id, appointment_date: state.date, start_time: state.time })
      try { localStorage.removeItem(key) } catch { /* Storage may be unavailable. */ }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true)
        setState(previous => ({ ...previous, time: '', step: 1 }))
        await queryClient.invalidateQueries({ queryKey: slotsKey })
      } else if (error instanceof ApiError && (!error.status || error.status >= 500)) {
        setUncertain(true)
      }
    } finally { submitLock.current = false; setSubmitting(false) }
  }
  return <>
    <h1>{title}</h1><p className={styles.intro}>{subtitle}</p><div className={styles.stepSpacing} />
    {step === 0 && <div className={styles.layout}><section className={`${styles.panel} ${styles.mainPanel}`}>
      {specialistsQuery.isPending ? <p role="status">Загружаем специалистов…</p> : specialistsQuery.isError ? <RequestError error={specialistsQuery.error} onRetry={specialistsQuery.refetch} /> : specialists.length === 0 ? <p>Для этой услуги пока нет доступных специалистов.</p> : <SpecialistStep specialists={specialists} selected={state.specialistId} onSelect={id => { setConflict(false); setState(previous => ({ ...selectSpecialist(previous, id), step: 0 })) }} />}
      <div className={styles.specialistFooter}><p className={styles.helper}>Доступно время после выбора мастера</p><Button disabled={!specialist || !canContinue({ ...state, step })} onClick={() => setState(previous => ({ ...previous, step: 1 }))}>Продолжить →</Button></div>
    </section><aside className={`${styles.panel} ${styles.bookingSummary}`}><h2>Ваше бронирование</h2><h3>{organization.name}</h3><div className={styles.overviewRow}><small>Услуга</small><span>{service.name}</span></div><div className={styles.overviewRow}><small>Продолжительность</small><span>{service.duration} минут</span></div><div className={styles.total}>Итого <span>{price}</span></div>{priceQuery.isPending && <p role="status">Загружаем стоимость…</p>}{priceQuery.isError && <RequestError error={priceQuery.error} onRetry={priceQuery.refetch} />}</aside></div>}
    {step === 1 && <>{conflict && <p role="alert">Время или услуга больше недоступны. Выберите другой свободный интервал.</p>}<DateTimeStep specialistId={state.specialistId} serviceId={service.id} date={state.date} time={state.time} onDate={date => { setConflict(false); setState(previous => ({ ...selectDate(previous, date), step: 1 })) }} onTime={time => { setConflict(false); setState(previous => ({ ...previous, time, step: 1 })) }} onNext={() => setState(previous => ({ ...previous, step: 2 }))} canNext={canContinue({ ...state, step }) && timeValid && !slots.isFetching} /></>}
    {step === 2 && <div className={styles.layout}><form className={`${styles.panel} ${styles.mainPanel}`} onSubmit={submit}><h2>Контактные данные</h2>
      {auth.status === 'authenticated' && auth.user ? <><p>Запись будет создана для вашей учётной записи.</p><div className={styles.contactFields}><label>Имя и фамилия<input required maxLength={100} autoComplete="name" value={name} onChange={event => setContact({ name: event.target.value, phone })} /></label><label>Телефон<input required maxLength={32} type="tel" autoComplete="tel" value={phone} onChange={event => setContact({ name, phone: event.target.value })} /></label><label>Email<input value={auth.user.email} readOnly /></label></div><p className={styles.demoNote}>Имя и телефон сохраняются в вашем профиле. Email используется из учётной записи.</p></> : auth.status === 'checking' ? <p role="status">Проверяем вход…</p> : <p>Для записи необходимо <Link to="/login" state={{ from: location.pathname + location.search }}>войти в аккаунт</Link>.</p>}
      {profileError && <p role="alert">{profileError}</p>}
      {priceQuery.isError && <RequestError error={priceQuery.error} onRetry={priceQuery.refetch} />}
      {slots.isError && <RequestError error={slots.error} onRetry={slots.refetch} />}
      {mutation.isError && !conflict && !uncertain && <p role="alert">{mutation.error instanceof ApiError && mutation.error.status === 401 ? 'Сессия завершилась. Войдите снова.' : mutation.error instanceof ApiError && mutation.error.status === 404 ? 'Услуга или специалист больше недоступны.' : 'Не удалось создать запись. Попробуйте позже.'}</p>}
      {uncertain && <p role="alert">Не удалось подтвердить результат запроса. Запись могла быть создана; уточните её наличие в организации перед повторной попыткой.</p>}
      <div className={`${styles.actions} ${styles.confirmationActions}`}><Button type="submit" disabled={!timeValid || slots.isFetching || !priceQuery.isSuccess || auth.status !== 'authenticated' || submitting || mutation.isPending || mutation.isSuccess || uncertain}>{submitting || mutation.isPending ? 'Отправляем…' : 'Подтвердить запись →'}</Button></div>
      {!timeValid && <p role="alert">Выбранное время недоступно или ещё проверяется.</p>}
    </form><aside><section className={`${styles.panel} ${styles.bookingSummary}`}><h2>Детали записи</h2><dl className={styles.summary}><div><dt>Организация</dt><dd>{organization.name}</dd></div><div><dt>Услуга</dt><dd>{service.name}</dd></div><div><dt>Мастер</dt><dd>{specialist?.name}</dd></div><div><dt>Дата и время</dt><dd>{formattedDate} · {state.time.slice(0, 5)}</dd></div><div><dt>Стоимость</dt><dd>{price}</dd></div></dl></section>{mutation.isSuccess && <div role="status" className={styles.notice}><strong>✓ Запись подтверждена</strong><p>Номер записи: {mutation.data.id}</p></div>}</aside></div>}
  </>
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const organizationId = /^\d+$/.test(id ?? '') && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null
  const query = useOrganization(organizationId)
  const service = query.data?.services.find(item => String(item.id) === params.get('service'))
  return <div id="booking-page" className={styles.page}>{organizationId === null ? <><h1>Онлайн-запись</h1><p>Организация не найдена.</p><Link to="/search">Найти организацию</Link></> : query.isPending ? <><h1>Онлайн-запись</h1><p role="status">Загружаем организацию…</p></> : query.isError ? <><h1>Онлайн-запись</h1><RequestError error={query.error} onRetry={query.refetch} /></> : !query.data || !service ? <><h1>Онлайн-запись</h1><p>Выберите услугу на странице организации.</p><Link to={`/organizations/${organizationId}`}>Перейти к услугам</Link></> : <BookingWizard key={`${organizationId}:${service.id}`} organization={query.data} service={service} />}</div>
}
