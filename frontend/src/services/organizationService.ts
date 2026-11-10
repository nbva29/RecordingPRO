import { mockOrganizations } from "../data/mockOrganizations";
import type { Organization } from "../types/organization";

export const organizationService = {
  async getAll(): Promise<Organization[]> {
    return mockOrganizations;
  },

  async getById(id: number): Promise<Organization | null> {
    return (
      mockOrganizations.find((organization) => organization.id === id) ?? null
    );
  },
};
