export interface CatalogParams {
  search?: string;
  city?: string;
  category?: string;
}

export interface ServiceDto {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
}

export interface CategoryDto { id: number; name: string }
export interface CategoryWithServicesDto extends CategoryDto { services: ServiceDto[] }
export interface OrganizationDto {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  phone: string | null;
  categories: CategoryWithServicesDto[];
}
