import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../src/contexts/AuthContext';
import { session } from '../src/services/api';
import type { User } from '../src/types';

export const student: User = { id: 2, username: 'ana', name: 'Ana Silva', role: 'STUDENT', courseId: 1 };
export const secretary: User = { id: 1, username: 'secretaria', name: 'Secretaria de Graduação', role: 'SECRETARY', courseId: null };

/** Mostra a URL atual para os testes conferirem busca e página. */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="url">{loc.pathname + loc.search}</div>;
}

export function renderApp(ui: ReactElement, opts: { route?: string; user?: User } = {}) {
  if (opts.user) session.set({ token: 'token-teste', user: opts.user });
  return render(
    <MemoryRouter initialEntries={[opts.route ?? '/']}>
      <AuthProvider>
        {ui}
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

interface Req {
  method: string;
  path: string;
  body: any;
  headers: Record<string, string>;
}
interface Res {
  status?: number;
  body?: unknown;
}

/** Substitui o fetch global; o handler devolve a resposta da API simulada (ou undefined = 404). */
export function mockApi(handler: (req: Req) => Res | undefined) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^\/api/, '');
    const req: Req = {
      method: init?.method ?? 'GET',
      path,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    const res = handler(req) ?? { status: 404, body: { error: { code: 'NOT_MOCKED', message: `sem mock para ${req.method} ${path}` } } };
    const status = res.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(res.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}
