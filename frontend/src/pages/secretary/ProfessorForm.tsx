import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { errorMessage } from '../../services/api';
import { createProfessor } from '../../services/professors';

export function ProfessorForm({ onSaved, onCancel }: { onSaved: (message: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Preencha o nome e o e-mail do professor.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProfessor({ name: name.trim(), email: email.trim() });
      onSaved('Professor cadastrado.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="Novo professor">
      <h2>Novo professor</h2>
      {error && <Notice notice={{ kind: 'error', text: error }} />}
      <div className="form-grid">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
      </div>
      <div className="card-actions">
        <button className="btn btn-primary" disabled={busy}>
          Salvar
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
