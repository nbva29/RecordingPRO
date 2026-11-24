import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../../auth/authSession";
import {
  changePrice,
  loadAdminDemo,
  removeService,
  upsertService,
} from "./adminData";
import type {
  AdminData,
  AdminOption,
  AdminService,
  PriceDetails,
} from "./adminData";

export function useAdminState() {
  const user = useAuthSession((state) => state.user);
  const queryClient = useQueryClient();
  const key = ["admin-demo", user?.id] as const;
  const data = useQuery({
    queryKey: key,
    queryFn: loadAdminDemo,
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
  return {
    data,
    saveService: (service: AdminService, categoryName: string) =>
      queryClient.setQueryData<AdminData>(key, (previous) => {
        if (!previous) return previous;
        const existing = previous.categories.find(
          (item) =>
            item.name.toLocaleLowerCase("ru-RU") ===
            categoryName.toLocaleLowerCase("ru-RU"),
        );
        const category = existing ?? {
          id: Math.max(0, ...previous.categories.map((item) => item.id)) + 1,
          name: categoryName,
        };
        return {
          ...previous,
          categories: existing
            ? previous.categories
            : [...previous.categories, category],
          services: upsertService(previous.services, {
            ...service,
            categoryId: category.id,
          }),
        };
      }),
    deleteService: (id: number) =>
      queryClient.setQueryData<AdminData>(key, (previous) =>
        previous
          ? { ...previous, services: removeService(previous.services, id) }
          : previous,
      ),
    setPrice: (
      id: number,
      price: number,
      options?: AdminOption[],
      details?: PriceDetails,
    ) =>
      queryClient.setQueryData<AdminData>(key, (previous) =>
        previous
          ? {
              ...previous,
              services: changePrice(
                previous.services,
                id,
                price,
                options,
                details,
              ),
            }
          : previous,
      ),
  };
}
export const AdminContext = createContext<ReturnType<
  typeof useAdminState
> | null>(null);
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is required");
  return value;
}
