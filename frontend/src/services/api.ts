import type { User } from '../types';

export interface Session {
  token: string;
  user: User;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Algo deu errado. Tente de novo.';

const SESSION_KEY = 'matricula.session';

/** Sessão no localStorage; se o navegador bloquear o storage, a sessão vale só até recarregar. */
let memory: Session | null = null;
export const session = {
  get(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return memory;
    }
  },
  set(s: Session) {
    memory = s;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
      /* storage indisponível */
    }
  },
  clear() {
    memory = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage indisponível */
    }
  },
};

let unauthorizedHandler: (() => void) | null = null;
/** Registrado pelo AuthProvider: chamado quando a API recusa a sessão (401). */
export const onUnauthorized = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

const BASE = import.meta.env.VITE_API_URL ?? '/api';

interface Options {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  anonymous?: boolean;
}

export async function api<T>(path: string, { method = 'GET', body, signal, anonymous }: Options = {}): Promise<T> {
  const current = anonymous ? null : session.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(current ? { Authorization: `Bearer ${current.token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !anonymous) unauthorizedHandler?.();
    const err = data?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Erro inesperado do servidor', err?.details);
  }
  return data as T;
}
