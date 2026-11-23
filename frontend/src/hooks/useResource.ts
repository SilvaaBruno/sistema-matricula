import { useEffect, useState } from 'react';

export interface Resource<T> {
  data?: T;
  error?: unknown;
  loading: boolean;
  reload: () => void;
}

/** Carrega dados da API tratando carregamento, erro e nova tentativa; descarta respostas atrasadas. */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): Resource<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ data: s.error ? undefined : s.data, loading: true }));
    load(ctrl.signal).then(
      (data) => setState({ data, loading: false }),
      (error) => {
        if (!ctrl.signal.aborted) setState({ error, loading: false });
      },
    );
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
