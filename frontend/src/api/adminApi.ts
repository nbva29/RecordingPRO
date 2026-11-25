import { httpClient } from "./httpClient";
import type { AppointmentDetailsDto } from "./clientApi";
import type { ServiceDto } from "../types/catalogApi";
import type { OptionDto } from "./bookingApi";
import type { SpecialistDto } from "./bookingApi";

export interface AdminServiceDto extends ServiceDto {
  discount_percent: number;
  final_price: number;
  is_available_for_online_booking: boolean;
}
export interface AdminAppointmentDto extends AppointmentDetailsDto {
  client: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}
export interface StatisticsCounts {
  total: number;
  created: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  history: number;
}
export interface OrganizationStatisticsDto {
  organization_id: number;
  date_from: string;
  date_to: string;
  counts: StatisticsCounts;
  unique_clients: number;
  daily: (StatisticsCounts & { date: string })[];
  popular_services: {
    service_id: number;
    name: string;
    appointments_count: number;
  }[];
  previous_period: { date_from: string; date_to: string; total: number };
  percentages: {
    total_change: number | null;
    completed: number;
    cancelled: number;
  };
}
export interface ServiceInput {
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  discount_percent: number;
  is_available_for_online_booking: boolean;
}
export interface WorkInterval {
  day_of_week: number;
  start_time: string;
  end_time: string;
}
export interface ScheduleDto {
  specialist_id: number;
  intervals: WorkInterval[];
}

export const adminApi = {
  async schedule(id: number, signal?: AbortSignal) {
    return (
      await httpClient.get<ScheduleDto>(`/specialists/${id}/schedule`, {
        signal,
      })
    ).data;
  },
  async saveSchedule(id: number, intervals: WorkInterval[]) {
    return (
      await httpClient.put<ScheduleDto>(`/specialists/${id}/schedule`, {
        intervals,
      })
    ).data;
  },
  async specialists(org: number, signal?: AbortSignal) {
    return (
      await httpClient.get<SpecialistDto[]>(
        `/organizations/${org}/specialists`,
        { signal },
      )
    ).data;
  },
  async createSpecialist(org: number, name: string, serviceId: number) {
    return (
      await httpClient.post<SpecialistDto>(
        `/organizations/${org}/specialists`,
        { name, service_ids: [serviceId] },
      )
    ).data;
  },
  async assignServices(id: number, serviceIds: number[]) {
    return (
      await httpClient.patch<SpecialistDto>(`/specialists/${id}`, {
        service_ids: serviceIds,
      })
    ).data;
  },
  async services(org: number, signal?: AbortSignal) {
    return (
      await httpClient.get<AdminServiceDto[]>(
        `/organizations/${org}/services`,
        { signal },
      )
    ).data;
  },
  async createService(org: number, input: ServiceInput) {
    return (
      await httpClient.post<AdminServiceDto>(
        `/organizations/${org}/services`,
        input,
      )
    ).data;
  },
  async updateService(id: number, input: Partial<ServiceInput>) {
    return (await httpClient.patch<AdminServiceDto>(`/services/${id}`, input))
      .data;
  },
  async deleteService(id: number) {
    await httpClient.delete(`/services/${id}`);
  },
  async createCategory(org: number, name: string) {
    return (
      await httpClient.post<{ id: number; name: string }>(
        `/organizations/${org}/categories`,
        { name },
      )
    ).data;
  },
  async options(id: number, signal?: AbortSignal) {
    return (
      await httpClient.get<OptionDto[]>(`/services/${id}/options`, { signal })
    ).data;
  },
  async createOption(id: number, name: string, price: number) {
    return (
      await httpClient.post<OptionDto>(`/services/${id}/options`, {
        name,
        price,
      })
    ).data;
  },
  async updateOption(id: number, name: string, price: number) {
    return (
      await httpClient.patch<OptionDto>(`/options/${id}`, { name, price })
    ).data;
  },
  async deleteOption(id: number) {
    await httpClient.delete(`/options/${id}`);
  },
  async appointments(
    org: number,
    from: string,
    to: string,
    signal?: AbortSignal,
  ) {
    return (
      await httpClient.get<AdminAppointmentDto[]>(
        `/organizations/${org}/appointments`,
        { params: { date_from: from, date_to: to }, signal },
      )
    ).data;
  },
  async statistics(org: number, period: number, signal?: AbortSignal) {
    return (
      await httpClient.get<OrganizationStatisticsDto>(
        `/organizations/${org}/statistics`,
        { params: { period_days: period }, signal },
      )
    ).data;
  },
};
