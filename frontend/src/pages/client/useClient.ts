import { createContext, useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../../auth/authSession";
import {
  cancelBooking,
  loadDemoBookings,
  rescheduleBooking,
} from "./clientData";
import type { ClientBooking, ClientProfile } from "./clientData";

export function useClientState() {
  const user = useAuthSession((state) => state.user);
  const queryClient = useQueryClient();
  const key = ["client-demo-bookings", user?.id] as const;
  const bookings = useQuery({
    queryKey: key,
    queryFn: loadDemoBookings,
    staleTime: Infinity,
    enabled: !!user,
    retry: false,
  });
  const [profile, setProfile] = useState<ClientProfile>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  }));
  return {
    bookings,
    profile,
    setProfile,
    cancel: (id: string) =>
      queryClient.setQueryData<ClientBooking[]>(key, (previous) =>
        previous ? cancelBooking(previous, id) : previous,
      ),
    reschedule: (id: string, date: string, time: string) =>
      queryClient.setQueryData<ClientBooking[]>(key, (previous) =>
        previous ? rescheduleBooking(previous, id, date, time) : previous,
      ),
  };
}

export const Context = createContext<ReturnType<typeof useClientState> | null>(
  null,
);
export function useClient() {
  const value = useContext(Context);
  if (!value) throw new Error("ClientProvider is required");
  return value;
}
