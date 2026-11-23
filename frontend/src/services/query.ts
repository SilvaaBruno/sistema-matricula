export const PAGE_SIZE = 10;

export interface ListParams {
  page: number;
  search: string;
  pageSize?: number;
}

export function listQuery({ page, search, pageSize = PAGE_SIZE }: ListParams) {
  const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) p.set('search', search);
  return p.toString();
}
