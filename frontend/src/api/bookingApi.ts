import { httpClient } from './httpClient'

export interface SpecialistDto { id: number; organization_id: number; name: string; description: string | null; service_ids: number[] }
export interface SlotDto { start_time: string; end_time: string }
export interface SlotsDto { specialist_id: number; service_id: number; date: string; slots: SlotDto[] }
export interface OptionDto { id: number; service_id: number; name: string; price: number }
export interface PriceDto { service_id: number; base_price: number; discount_percent: number; discount_amount: number; final_price: number; options: OptionDto[]; options_total: number; total_price: number }
export interface AppointmentInput { specialist_id: number; service_id: number; appointment_date: string; start_time: string }
export interface AppointmentDto extends AppointmentInput { id: string; client_id: string; end_time: string; status: 'created' | 'confirmed' | 'completed' | 'cancelled'; created_at: string }

export const bookingApi = {
  async getSpecialists(serviceId: number, signal?: AbortSignal) {
    return (await httpClient.get<SpecialistDto[]>(`/services/${serviceId}/specialists`, { signal })).data
  },
  async getSlots(specialistId: number, serviceId: number, date: string, signal?: AbortSignal) {
    return (await httpClient.get<SlotsDto>(`/specialists/${specialistId}/slots`, { params: { service_id: serviceId, date }, signal })).data
  },
  async calculatePrice(serviceId: number, optionIds: number[], signal?: AbortSignal) {
    return (await httpClient.post<PriceDto>(`/services/${serviceId}/price`, { option_ids: optionIds }, { signal })).data
  },
  async createAppointment(input: AppointmentInput) {
    return (await httpClient.post<AppointmentDto>('/appointments', input)).data
  },
}
