import type { ReactNode } from 'react';
import type { Resource } from '../hooks/useResource';
import { errorMessage } from '../services/api';

interface Props<T> {
  resource: Resource<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode | ((data: T) => ReactNode);
  children: (data: T) => ReactNode;
}

/** Os quatro estados de uma tela com dados remotos: carregando, erro (com retry), vazio e conteúdo. */
export function AsyncView<T>({ resource, isEmpty, empty, children }: Props<T>) {
  const { data, error, loading, reload } = resource;
  if (error) {
    return (
      <div className="state" role="alert">
        <p>{errorMessage(error)}</p>
        <button className="btn" onClick={reload}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (data === undefined) {
    return (
      <div className="state" role="status">
        Carregando…
      </div>
    );
  }
  if (isEmpty?.(data)) return <div className="state">{typeof empty === 'function' ? empty(data) : empty}</div>;
  return <div aria-busy={loading}>{children(data)}</div>;
}
