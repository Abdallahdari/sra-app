import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from './api';
import type { ContentType, Item, Page, Settings } from './types';

export type Stats = {
  byType: Record<ContentType, { total: number; drafts: number }>;
  recent: Pick<Item, '_id' | 'type' | 'title' | 'updatedAt' | 'published' | 'image'>[];
  total: number;
};

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  list: (type: string, q?: string) => ['admin', 'list', type, q ?? ''] as const,
  item: (id: string) => ['admin', 'item', id] as const,
};

export function useAdminStats(enabled = true) {
  return useQuery({ queryKey: adminKeys.stats, queryFn: () => api<Stats>('/api/admin/stats'), enabled, staleTime: 0 });
}

export function useAdminList(type: ContentType, q?: string) {
  return useInfiniteQuery({
    queryKey: adminKeys.list(type, q),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<Page<Item>>(`/api/admin/content${qs({ type, q, page: pageParam, limit: 30 })}`),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 0,
  });
}

export function useAdminItem(id?: string) {
  return useQuery({
    queryKey: adminKeys.item(id || 'new'),
    queryFn: () => api<Item>(`/api/admin/content/${id}`),
    enabled: !!id,
    staleTime: 0,
  });
}

/** After any change, refresh admin data and the public screens that show it. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return (type?: string, id?: string) => {
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['home'] });
    qc.invalidateQueries({ queryKey: ['settings'] });
    if (type) {
      qc.invalidateQueries({ queryKey: ['list', type] });
      qc.invalidateQueries({ queryKey: ['categories', type] });
    }
    if (id) qc.invalidateQueries({ queryKey: ['item', id] });
  };
}

export function useSaveItem() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Item> }) =>
      id ? api<Item>(`/api/admin/content/${id}`, { method: 'PUT', json: data }) : api<Item>('/api/admin/content', { method: 'POST', json: data }),
    onSuccess: (item) => invalidate(item.type, item._id),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id }: { id: string; type: string }) => api(`/api/admin/content/${id}`, { method: 'DELETE' }),
    onSuccess: (_, v) => invalidate(v.type, v.id),
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: Settings) => api<Settings>('/api/admin/settings', { method: 'PUT', json: data }),
    onSuccess: () => invalidate(),
  });
}
