import type { OrganizationDto } from '../types/catalogApi';
import type { Organization } from '../types/organization';

export function toOrganization(dto: OrganizationDto): Organization {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    address: dto.address,
    city: dto.city,
    phone: dto.phone,
    categories: dto.categories.map(({ id, name }) => ({ id, name })),
    services: dto.categories.flatMap(({ services }) => services.map(
      ({ id, name, price, duration }) => ({ id, name, price, duration }),
    )),
    // Decorative UI color, not organization data supplied by the API.
    background: '#D9EFE7',
  };
}

export function getCategoryNames(organizations: OrganizationDto[]): string[] {
  return [...new Set(organizations.flatMap(({ categories }) => categories.map(({ name }) => name)))];
}
