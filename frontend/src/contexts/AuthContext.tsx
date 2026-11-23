import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onUnauthorized, session, type Session } from '../services/api';
import type { Role, User } from '../types';

interface AuthValue {
  user: User | null;
  sessionExpired: boolean;
  login: (username: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const homeOf = (role: Role) => (role === 'STUDENT' ? '/aluno' : '/secretaria');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Session | null>(() => session.get());
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    session.clear();
    setCurrent(null);
  }, []);

  // Sessão expirada (401 em qualquer chamada): volta ao login com aviso.
  useEffect(() => {
    onUnauthorized(() => {
      session.clear();
      setCurrent(null);
      setSessionExpired(true);
    });
    return () => onUnauthorized(null);
  }, []);

  const login = useCallback(async (username: string) => {
    const s = await api<Session>('/auth/login', { method: 'POST', body: { username }, anonymous: true });
    session.set(s);
    setCurrent(s);
    setSessionExpired(false);
    return s.user;
  }, []);

  const value = useMemo(
    () => ({ user: current?.user ?? null, sessionExpired, login, logout }),
    [current, sessionExpired, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
