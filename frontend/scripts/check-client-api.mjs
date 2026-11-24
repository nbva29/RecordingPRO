import assert from "node:assert/strict";
import { createServer } from "vite";
import axios from "axios";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { httpClient } = await server.ssrLoadModule("/src/api/httpClient.ts");
  const { clientApi } = await server.ssrLoadModule("/src/api/clientApi.ts");
  const requests = [];
  httpClient.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: config.url === "/appointments/me" ? [] : { id: "a" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  assert.deepEqual(await clientApi.appointments(), []);
  await clientApi.cancel("a");
  await clientApi.reschedule("a", "2030-01-02", "10:00");
  assert.equal(requests[0].url, "/appointments/me");
  assert.equal(requests[1].url, "/appointments/a/cancel");
  assert.equal(requests[2].url, "/appointments/a/reschedule");
  assert.deepEqual(JSON.parse(requests[2].data), {
    appointment_date: "2030-01-02",
    start_time: "10:00",
  });
  httpClient.defaults.adapter = async (config) => {
    throw new axios.AxiosError("Conflict", "ERR_BAD_REQUEST", config, null, {
      status: 409,
      statusText: "Conflict",
      headers: {},
      config,
      data: {},
    });
  };
  await assert.rejects(
    () => clientApi.reschedule("a", "2030-01-02", "10:00"),
    (error) => error.status === 409,
  );
  console.log(
    "PASS: client API paths, rescheduling payload and conflict handling",
  );
} finally {
  await server.close();
}
