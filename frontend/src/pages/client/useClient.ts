import { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../../auth/authSession";
import { authApi } from "../../api/authApi";
import { clientApi } from "../../api/clientApi";
import type { AppointmentDetailsDto } from "../../api/clientApi";
import type { ClientBooking, ClientProfile } from "./clientData";

function toBooking(item: AppointmentDetailsDto): ClientBooking {
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return {
    id: item.id,
    organization: item.organization.name,
    service: item.service.name,
    specialist: item.specialist.name,
    specialistId: item.specialist_id,
    serviceId: item.service_id,
    date: item.appointment_date,
    time: item.start_time.slice(0, 5),
    address: [item.organization.city, item.organization.address]
      .filter(Boolean)
      .join(", "),
    duration: minutes(item.end_time) - minutes(item.start_time),
    status: item.status,
  };
}

export function useClientState() {
  const user = useAuthSession((state) => state.user);
  const token = useAuthSession((state) => state.accessToken);
  const updateUser = useAuthSession((state) => state.updateUser);
  const queryClient = useQueryClient();
  const key = ["client-bookings", user?.id] as const;
  const profileQuery = useQuery({
    queryKey: ["client-profile", user?.id],
    queryFn: ({ signal }) => authApi.getCurrentUser(token!, signal),
    enabled: !!user && !!token,
    retry: false,
  });
  const current = profileQuery.data ?? user;
  const profile: ClientProfile = {
    name: current?.name ?? "",
    email: current?.email ?? "",
    phone: current?.phone ?? "",
  };
  const bookings = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      (await clientApi.appointments(signal)).map(toBooking),
    enabled: !!user && !!token,
    retry: false,
  });
  const saveProfile = useMutation({
    mutationFn: (draft: ClientProfile) => authApi.updateProfile(token!, draft),
    onSuccess: (result) => {
      if (token) updateUser(token, result);
      queryClient.setQueryData(["client-profile", user?.id], result);
    },
  });
  const cancel = useMutation({
    mutationFn: clientApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const reschedule = useMutation({
    mutationFn: ({
      id,
      date,
      time,
    }: {
      id: string;
      date: string;
      time: string;
    }) => clientApi.reschedule(id, date, time),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return { bookings, profile, profileQuery, saveProfile, cancel, reschedule };
}

export const Context = createContext<ReturnType<typeof useClientState> | null>(
  null,
);
export function useClient() {
  const value = useContext(Context);
  if (!value) throw new Error("ClientProvider is required");
  return value;
}
