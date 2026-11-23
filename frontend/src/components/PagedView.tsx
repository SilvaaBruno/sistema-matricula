import type { ReactNode } from 'react';
import type { Resource } from '../hooks/useResource';
import type { Page } from '../types';
import { AsyncView } from './AsyncView';
import { Pagination } from './Pagination';

interface Props<T> {
  resource: Resource<Page<T>>;
  search: string;
  emptyText: string;
  onPage: (page: number) => void;
  children: (items: T[]) => ReactNode;
}

/** Lista paginada: estados de carregamento/erro/vazio, busca sem resultado e página fora do intervalo. */
export function PagedView<T>({ resource, search, emptyText, onPage, children }: Props<T>) {
  return (
    <AsyncView
      resource={resource}
      isEmpty={(p) => p.data.length === 0}
      empty={(p) =>
        p.total > 0 ? (
          <>
            <p>Esta página não existe.</p>
            <button className="btn" onClick={() => onPage(1)}>
              Ir para a primeira página
            </button>
          </>
        ) : (
          <p>{search ? `Nenhum resultado para "${search}".` : emptyText}</p>
        )
      }
    >
      {(p) => (
        <>
          {children(p.data)}
          <Pagination page={p.page} pageSize={p.pageSize} total={p.total} onChange={onPage} />
        </>
      )}
    </AsyncView>
  );
}
