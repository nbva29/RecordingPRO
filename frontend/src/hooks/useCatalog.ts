import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../api/catalogApi';
import { ApiError } from '../api/httpClient';
import { getCategoryNames, toOrganization } from '../adapters/organizationAdapter';
import { organizationService } from '../services/organizationService';
import type { CatalogParams } from '../types/catalogApi';

export const catalogRetry = (count: number, error: Error) =>
  !(error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) && count < 1;

const listOptions = (params: CatalogParams) => ({
  queryKey: ['catalog', 'organizations', params] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => catalogApi.getOrganizations(params, signal),
  staleTime: 60_000,
  retry: catalogRetry,
});

export function useOrganizations(params: CatalogParams = {}) {
  const normalized = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => value),
  );
  return useQuery({ ...listOptions(normalized), select: (data) => data.map(toOrganization) });
}

export function useCatalogCategories() {
  return useQuery({ ...listOptions({}), select: getCategoryNames });
}

export function useOrganization(id: number | null) {
  return useQuery({
    queryKey: ['catalog', 'organization', id],
    queryFn: ({ signal }) => {
      if (id === null) throw new Error('Некорректный ID организации');
      return organizationService.getById(id, signal);
    },
    enabled: id !== null,
    retry: catalogRetry,
  });
}
