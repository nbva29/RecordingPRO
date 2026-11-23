import assert from 'node:assert/strict'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { selectSpecialist, selectDate, canContinue, localDate } = await server.ssrLoadModule('/src/pages/booking/bookingState.ts')
  const initial = { specialistId: 'a', date: '2030-01-01', time: '10:00', step: 2 }
  assert.deepEqual(selectSpecialist(initial, 'b'), { ...initial, specialistId: 'b', date: '', time: '' })
  assert.deepEqual(selectDate(initial, '2030-01-02'), { ...initial, date: '2030-01-02', time: '' })
  assert.equal(canContinue({ ...initial, specialistId: '', step: 0 }), false)
  assert.equal(canContinue({ ...initial, time: '', step: 1 }), false)
  assert.equal(canContinue({ ...initial, step: 1 }), true)
  assert.equal(localDate(new Date(2030, 0, 2)), '2030-01-02')
  const { getAvailableTimes } = await server.ssrLoadModule('/src/pages/booking/bookingData.ts')
  assert.deepEqual(await getAvailableTimes('a', '2030-01-06'), [])
  assert.ok((await getAvailableTimes('a', '2030-01-07')).includes('10:00'))
  console.log('PASS: booking state transitions and demo availability')
} finally { await server.close() }

