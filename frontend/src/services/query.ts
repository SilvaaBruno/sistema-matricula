export const PAGE_SIZE = 10;

export interface ListParams {
  page: number;
  search: string;
}

export function listQuery({ page, search }: ListParams) {
  const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search) p.set('search', search);
  return p.toString();
}
