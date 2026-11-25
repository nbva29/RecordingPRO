import { httpClient } from "./httpClient";
import type {
  CatalogParams,
  CategoryDto,
  OrganizationDto,
  ServiceDto,
} from "../types/catalogApi";

export const catalogApi = {
  async createOrganization(input: {
    name: string;
    city: string;
    address: string;
    description: string | null;
    phone: string | null;
  }) {
    return (await httpClient.post<{ id: number }>("/organizations", input))
      .data;
  },
  async getOrganizations(
    params: CatalogParams = {},
    signal?: AbortSignal,
  ): Promise<OrganizationDto[]> {
    return (
      await httpClient.get<OrganizationDto[]>("/organizations", {
        params,
        signal,
      })
    ).data;
  },
  async getOrganization(
    id: number,
    signal?: AbortSignal,
  ): Promise<OrganizationDto> {
    return (
      await httpClient.get<OrganizationDto>(`/organizations/${id}`, { signal })
    ).data;
  },
  async getOrganizationCategories(
    id: number,
    signal?: AbortSignal,
  ): Promise<CategoryDto[]> {
    return (
      await httpClient.get<CategoryDto[]>(`/organizations/${id}/categories`, {
        signal,
      })
    ).data;
  },
  async getOrganizationServices(
    id: number,
    signal?: AbortSignal,
  ): Promise<ServiceDto[]> {
    return (
      await httpClient.get<ServiceDto[]>(`/organizations/${id}/services`, {
        signal,
      })
    ).data;
  },
};
