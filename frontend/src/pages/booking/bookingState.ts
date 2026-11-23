export interface BookingState { specialistId: string; date: string; time: string; step: number }
export const initialBooking: BookingState = { specialistId: '', date: '', time: '', step: 0 }
export function selectSpecialist(state: BookingState, specialistId: string): BookingState {
  return state.specialistId === specialistId ? state : { ...state, specialistId, date: '', time: '' }
}
export function selectDate(state: BookingState, date: string): BookingState {
  return state.date === date ? state : { ...state, date, time: '' }
}
export function canContinue(state: BookingState): boolean {
  return state.step === 0 ? !!state.specialistId : !!state.specialistId && !!state.date && !!state.time
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
