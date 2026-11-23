import { z } from 'zod';

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const likePattern = (s?: string) => `%${(s ?? '').replace(/[%_]/g, '')}%`;
