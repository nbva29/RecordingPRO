import { httpClient } from "./httpClient";
import type { AppointmentDto } from "./bookingApi";

export interface AppointmentDetailsDto extends AppointmentDto {
  organization: { id: number; name: string; address: string; city: string };
  service: { id: number; name: string };
  specialist: { id: number; name: string };
}

export const clientApi = {
  async appointments(signal?: AbortSignal) {
    return (
      await httpClient.get<AppointmentDetailsDto[]>("/appointments/me", {
        signal,
      })
    ).data;
  },
  async cancel(id: string) {
    return (
      await httpClient.post<AppointmentDto>(
        `/appointments/${encodeURIComponent(id)}/cancel`,
      )
    ).data;
  },
  async reschedule(id: string, appointment_date: string, start_time: string) {
    return (
      await httpClient.post<AppointmentDto>(
        `/appointments/${encodeURIComponent(id)}/reschedule`,
        { appointment_date, start_time },
      )
    ).data;
  },
};
