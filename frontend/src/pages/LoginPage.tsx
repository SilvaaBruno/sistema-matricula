import { useState, type FormEvent } from 'react';
import { Notice } from '../components/Notice';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';

export function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError('Informe seu nome de usuário.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim()); // AppRoutes redireciona para a área do perfil
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit} noValidate>
        <h1>Sistema de Matrícula</h1>
        {sessionExpired && <Notice notice={{ kind: 'error', text: 'Sua sessão expirou. Entre novamente.' }} />}
        {error && <Notice notice={{ kind: 'error', text: error }} />}
        <label className="field">
          <span>Nome de usuário</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
