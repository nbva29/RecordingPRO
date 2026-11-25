import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../../auth/authSession";
import { adminApi } from "../../api/adminApi";
import { catalogApi } from "../../api/catalogApi";
import type {
  AdminData,
  AdminOption,
  AdminService,
  PriceDetails,
} from "./adminData";

export function useAdminState() {
  const user = useAuthSession((state) => state.user);
  const organizationId = user?.organization_id ?? 0;
  const queryClient = useQueryClient();
  const key = ["admin-services", user?.id, organizationId] as const;
  const data = useQuery({
    queryKey: key,
    enabled: !!user,
    retry: false,
    queryFn: async ({ signal }): Promise<AdminData> => {
      const [organization, services] = await Promise.all([
        catalogApi.getOrganization(organizationId, signal),
        adminApi.services(organizationId, signal),
      ]);
      const options = await Promise.all(
        services.map((service) => adminApi.options(service.id, signal)),
      );
      return {
        organization: organization.name,
        categories: organization.categories.map((item) => ({
          id: item.id,
          name: item.name,
        })),
        appointments: [],
        services: services.map((item, index) => ({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          duration: item.duration,
          discountPercent: item.discount_percent,
          online: item.is_available_for_online_booking,
          options: options[index].map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
          })),
        })),
      };
    },
  });
  async function syncOptions(
    serviceId: number,
    current: AdminOption[],
    updated: AdminOption[],
  ) {
    for (const item of current)
      if (!updated.some((next) => next.id === item.id))
        await adminApi.deleteOption(item.id);
    for (const item of updated) {
      const previous = current.find((option) => option.id === item.id);
      if (!previous)
        await adminApi.createOption(serviceId, item.name, item.price);
      else if (previous.name !== item.name || previous.price !== item.price)
        await adminApi.updateOption(item.id, item.name, item.price);
    }
  }
  async function saveService(
    service: AdminService,
    categoryName: string,
    specialistIds: number[],
    newSpecialist: string,
  ) {
    const previous = queryClient.getQueryData<AdminData>(key);
    if (!previous) throw new Error("Данные услуг ещё не загружены.");
    const existing = previous.services.find((item) => item.id === service.id);
    let category = previous.categories.find(
      (item) =>
        item.name.toLocaleLowerCase("ru-RU") ===
        categoryName.toLocaleLowerCase("ru-RU"),
    );
    try {
      if (!category)
        category = await adminApi.createCategory(organizationId, categoryName);
      const input = {
        name: service.name.trim(),
        description: service.description.trim() || null,
        price: service.price,
        duration: service.duration,
        discount_percent: service.discountPercent,
        is_available_for_online_booking: service.online,
      };
      const saved = existing
        ? await adminApi.updateService(existing.id, {
            ...input,
            category_id: category.id,
          })
        : await adminApi.createService(organizationId, {
            ...input,
            category_id: category.id,
          });
      const specialists = await adminApi.specialists(organizationId);
      for (const id of specialistIds)
        if (!specialists.some((item) => item.id === id))
          throw new Error("Выбранный мастер больше недоступен.");
      for (const specialist of specialists) {
        const assigned = specialist.service_ids.includes(saved.id);
        const selected = specialistIds.includes(specialist.id);
        if (assigned !== selected)
          await adminApi.assignServices(
            specialist.id,
            selected
              ? [...specialist.service_ids, saved.id]
              : specialist.service_ids.filter((id) => id !== saved.id),
          );
      }
      if (newSpecialist.trim())
        await adminApi.createSpecialist(
          organizationId,
          newSpecialist.trim(),
          saved.id,
        );
      await syncOptions(
        saved.id,
        existing?.options ?? [],
        service.options ?? [],
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : "Ошибка сохранения."} Часть изменений могла сохраниться; проверьте список услуг перед повтором.`,
      );
    } finally {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({
        queryKey: ["admin-specialists", organizationId],
      });
    }
  }
  async function deleteService(id: number) {
    await adminApi.deleteService(id);
    await queryClient.invalidateQueries({ queryKey: key });
  }
  async function setPrice(
    id: number,
    price: number,
    options?: AdminOption[],
    details?: PriceDetails,
  ) {
    const existing = queryClient
      .getQueryData<AdminData>(key)
      ?.services.find((item) => item.id === id);
    if (!existing || !details) throw new Error("Услуга не найдена.");
    try {
      await adminApi.updateService(id, {
        price,
        discount_percent: details.discountPercent,
      });
      await syncOptions(id, existing.options ?? [], options ?? []);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : "Ошибка сохранения."} Часть изменений могла сохраниться; проверьте услугу перед повтором.`,
      );
    } finally {
      await queryClient.invalidateQueries({ queryKey: key });
    }
  }
  return { data, saveService, deleteService, setPrice };
}
export const AdminContext = createContext<ReturnType<
  typeof useAdminState
> | null>(null);
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is required");
  return value;
}
