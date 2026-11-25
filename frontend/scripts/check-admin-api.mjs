import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { httpClient } = await server.ssrLoadModule("/src/api/httpClient.ts");
  const { adminApi } = await server.ssrLoadModule("/src/api/adminApi.ts");
  const requests = [];
  httpClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: [], status: 200, statusText: "OK", headers: {}, config };
  };
  await adminApi.appointments(1, "2030-01-07", "2030-01-13");
  await adminApi.statistics(1, 30);
  await adminApi.updateService(7, { price: 1500, discount_percent: 10 });
  await adminApi.createSpecialist(1, "Анна", 7);
  await adminApi.assignServices(4, [2, 7]);
  await adminApi.schedule(4);
  await adminApi.saveSchedule(4, [
    { day_of_week: 0, start_time: "09:00", end_time: "18:00" },
  ]);
  assert.equal(requests[0].url, "/organizations/1/appointments");
  assert.deepEqual(requests[0].params, {
    date_from: "2030-01-07",
    date_to: "2030-01-13",
  });
  assert.equal(requests[1].url, "/organizations/1/statistics");
  assert.deepEqual(requests[1].params, { period_days: 30 });
  assert.deepEqual(JSON.parse(requests[2].data), {
    price: 1500,
    discount_percent: 10,
  });
  assert.equal(requests[3].url, "/organizations/1/specialists");
  assert.deepEqual(JSON.parse(requests[3].data), {
    name: "Анна",
    service_ids: [7],
  });
  assert.equal(requests[4].url, "/specialists/4");
  assert.deepEqual(JSON.parse(requests[4].data), { service_ids: [2, 7] });
  assert.equal(requests[5].url, "/specialists/4/schedule");
  assert.equal(requests[6].method, "put");
  assert.deepEqual(JSON.parse(requests[6].data), {
    intervals: [{ day_of_week: 0, start_time: "09:00", end_time: "18:00" }],
  });
  console.log("PASS: admin API request contracts");
} finally {
  await server.close();
}
