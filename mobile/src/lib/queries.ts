import { useInfiniteQuery, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { api, qs } from './api';
import type { ContentType, Home, Item, Page, Settings, TypeDef } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // show cached data instantly, refresh in background after 1 min
      gcTime: 1000 * 60 * 60 * 24 * 7, // keep for a week so the app opens offline
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const keys = {
  home: ['home'] as const,
  list: (type: ContentType, category?: string, q?: string) => ['list', type, category ?? '', q ?? ''] as const,
  item: (id: string) => ['item', id] as const,
  categories: (type: ContentType) => ['categories', type] as const,
  types: ['types'] as const,
  settings: ['settings'] as const,
};

export function useHome() {
  return useQuery({ queryKey: keys.home, queryFn: () => api<Home>('/api/home') });
}

export function useSettings() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api<Settings>('/api/settings'),
    placeholderData: () => qc.getQueryData<Home>(keys.home)?.settings,
  });
}

export function useList(type: ContentType, opts: { category?: string; q?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 20;
  return useInfiniteQuery({
    queryKey: keys.list(type, opts.category, opts.q),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Page<Item>>(`/api/content${qs({ type, category: opts.category, q: opts.q, page: pageParam, limit })}`),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/** Detail query. Uses the list/home copy as a placeholder so screens open instantly. */
export function useItem(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.item(id),
    queryFn: () => api<Item>(`/api/content/${id}`),
    placeholderData: () => findCached(qc, id),
  });
}

function findCached(qc: QueryClient, id: string): Item | undefined {
  const home = qc.getQueryData<Home>(keys.home);
  if (home) {
    for (const v of Object.values(home)) {
      if (Array.isArray(v)) {
        const hit = (v as Item[]).find((x) => x._id === id);
        if (hit) return hit;
      }
    }
  }
  for (const [, data] of qc.getQueriesData<{ pages: Page<Item>[] }>({ queryKey: ['list'] })) {
    for (const p of data?.pages ?? []) {
      const hit = p.items.find((x) => x._id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function useCategories(type: ContentType) {
  return useQuery({
    queryKey: keys.categories(type),
    queryFn: () => api<{ name: string; count: number }[]>(`/api/categories?type=${type}`),
    staleTime: 10 * 60_000,
  });
}

export function useTypes() {
  return useQuery({
    queryKey: keys.types,
    queryFn: async () => (await api<{ types: TypeDef[] }>('/api/meta/types')).types,
    staleTime: 60 * 60_000,
  });
}
