import assert from 'node:assert/strict'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { cancelBooking, rescheduleBooking, splitBookings, validateProfile } = await server.ssrLoadModule('/src/pages/client/clientData.ts')
  const now = new Date('2030-01-01T09:00:00')
  const upcoming = { id: '1', date: '2030-01-03', time: '10:00', status: 'confirmed' }
  const past = { id: '2', date: '2029-12-30', time: '10:00', status: 'confirmed' }
  const bookings = [upcoming, past]
  assert.deepEqual(splitBookings(bookings, now), { upcoming: [upcoming], history: [past] })
  assert.equal(cancelBooking(bookings, '1', now)[0].status, 'cancelled')
  assert.equal(cancelBooking(bookings, '2', now)[1].status, 'confirmed')
  assert.equal(rescheduleBooking(bookings, '1', '2030-01-04', '14:00', now)[0].date, '2030-01-04')
  assert.equal(rescheduleBooking(bookings, '1', '2029-12-01', '14:00', now)[0].date, '2030-01-03')
  assert.ok(validateProfile({ name: '', phone: '123', email: 'bad' }).name)
  assert.deepEqual(validateProfile({ name: 'Анна', phone: '+7 999 123-45-67', email: 'a@example.com' }), {})
  console.log('PASS: client booking and profile behavior')
} finally { await server.close() }
