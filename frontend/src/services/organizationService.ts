import { catalogApi } from "../api/catalogApi";
import { toOrganization } from "../adapters/organizationAdapter";
import type { CatalogParams } from "../types/catalogApi";
import type { Organization } from "../types/organization";

export const organizationService = {
  async getAll(params: CatalogParams = {}, signal?: AbortSignal): Promise<Organization[]> {
    return (await catalogApi.getOrganizations(params, signal)).map(toOrganization);
  },

  async getById(id: number, signal?: AbortSignal): Promise<Organization> {
    return toOrganization(await catalogApi.getOrganization(id, signal));
  },
};
