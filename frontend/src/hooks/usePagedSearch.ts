import { useSearchParams } from 'react-router-dom';

/** Busca e página vivem na URL (?search=…&page=…), então recarregar ou voltar preserva o estado. */
export function usePagedSearch() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const search = params.get('search') ?? '';

  function update(next: { page?: number; search?: string }) {
    const p = new URLSearchParams(params);
    const nextPage = next.page ?? page;
    const nextSearch = next.search ?? search;
    if (nextPage > 1) p.set('page', String(nextPage));
    else p.delete('page');
    if (nextSearch) p.set('search', nextSearch);
    else p.delete('search');
    setParams(p);
  }

  return {
    page,
    search,
    setPage: (n: number) => update({ page: n }),
    setSearch: (s: string) => update({ search: s, page: 1 }),
  };
}
