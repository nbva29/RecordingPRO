import assert from 'node:assert/strict'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { bookingApi } = await server.ssrLoadModule('/src/api/bookingApi.ts')
  const { httpClient } = await server.ssrLoadModule('/src/api/httpClient.ts')
  const requests = []
  httpClient.defaults.adapter = async config => { requests.push(config); return { data: config.url === '/appointments' ? { id: 'appointment-1', status: 'confirmed' } : config.url.endsWith('/slots') ? { slots: [{ start_time: '10:00:00', end_time: '11:00:00' }] } : [], status: 200, statusText: 'OK', headers: {}, config } }
  await bookingApi.getSpecialists(7)
  await bookingApi.getSlots(3, 7, '2030-01-07')
  await bookingApi.calculatePrice(7, [9])
  await bookingApi.createAppointment({ specialist_id: 3, service_id: 7, appointment_date: '2030-01-07', start_time: '10:00:00' })
  assert.equal(requests[0].url, '/services/7/specialists')
  assert.deepEqual(requests[1].params, { service_id: 7, date: '2030-01-07' })
  assert.deepEqual(JSON.parse(requests[2].data), { option_ids: [9] })
  assert.deepEqual(JSON.parse(requests[3].data), { specialist_id: 3, service_id: 7, appointment_date: '2030-01-07', start_time: '10:00:00' })
  const { AxiosError } = await import('axios')
  httpClient.defaults.adapter = async config => {
    throw new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, null, { status: 409, statusText: 'Conflict', data: {}, headers: {}, config })
  }
  await assert.rejects(() => bookingApi.createAppointment({ specialist_id: 3, service_id: 7, appointment_date: '2030-01-07', start_time: '10:00:00' }), error => error.status === 409)
  httpClient.defaults.adapter = async config => { throw new AxiosError('Network Error', 'ERR_NETWORK', config) }
  await assert.rejects(() => bookingApi.getSlots(3, 7, '2030-01-07'), error => error.status === undefined)
  const { safeReturnTo } = await server.ssrLoadModule('/src/auth/navigation.ts')
  assert.equal(safeReturnTo('client', '/booking/1?service=2'), '/booking/1?service=2')
  assert.equal(safeReturnTo('client', '//example.com/booking/1'), '/client')
  console.log('PASS: booking API request contracts')
} finally { await server.close() }
