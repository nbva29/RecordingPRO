import assert from 'node:assert/strict'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const { validateService, upsertService, changePrice, appointmentsForDate, parseOptions, removeService } = await server.ssrLoadModule('/src/pages/admin/adminData.ts')
  const valid = { id: 1, name: 'Стрижка', categoryId: 1, description: '', price: 1200, duration: 60, discountPercent: 0, online: true }
  assert.deepEqual(validateService(valid), {})
  assert.ok(validateService({ ...valid, name: '', price: -1, duration: 0 }).name)
  assert.ok(validateService({ ...valid, price: -1 }).price)
  assert.ok(validateService({ ...valid, duration: 0 }).duration)
  assert.equal(upsertService([valid], { ...valid, name: 'Укладка' }).length, 1)
  assert.equal(upsertService([valid], { ...valid, id: 2 }).length, 2)
  assert.deepEqual(removeService([valid], 1), [])
  assert.deepEqual(upsertService([], { ...valid, address: 'Томск', specialist: 'Анна', showOldPrice: true })[0].address, 'Томск')
  assert.equal(changePrice([valid], 1, 1500)[0].price, 1500)
  assert.deepEqual(changePrice([valid], 1, 1500, [{ id: 1, name: 'Дополнение', price: 300 }])[0].options, [{ id: 1, name: 'Дополнение', price: 300 }])
  const updated = changePrice([valid], 1, 1800, [], { discountPercent: 10, oldPrice: 2000, minPrice: 1500, maxPrice: 3000 })[0]
  assert.equal(updated.discountPercent, 10)
  assert.equal(updated.oldPrice, 2000)
  assert.equal(updated.minPrice, 1500)
  assert.equal(updated.maxPrice, 3000)
  assert.equal(changePrice([valid], 1, 1800, [], { discountPercent: 101, oldPrice: null, minPrice: null, maxPrice: null })[0].price, 1200)
  assert.equal(changePrice([valid], 1, 1800, [], { discountPercent: 0, oldPrice: -1, minPrice: null, maxPrice: null })[0].price, 1200)
  assert.equal(parseOptions([{ id: 1, name: ' ', price: '100' }]), null)
  assert.equal(parseOptions([{ id: 1, name: 'Опция', price: '-1' }]), null)
  assert.deepEqual(parseOptions([{ id: 1, name: ' Опция ', price: '300' }]), [{ id: 1, name: 'Опция', price: 300 }])
  assert.equal(changePrice([valid], 1, -5)[0].price, 1200)
  assert.equal(appointmentsForDate([{ id: 'a', date: '2030-01-01' }, { id: 'b', date: '2030-01-02' }], '2030-01-01').length, 1)
  console.log('PASS: admin local service and calendar behavior')
} finally { await server.close() }
