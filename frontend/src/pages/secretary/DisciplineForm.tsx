import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { errorMessage } from '../../services/api';
import { PrerequisitePicker } from './PrerequisitePicker';
import { createDiscipline, updateDiscipline, type Discipline } from '../../services/disciplines';

// Regra 2: CH múltipla de 15 entre 15h e 120h.
const WORKLOADS = Array.from({ length: 8 }, (_, i) => (i + 1) * 15);

export function DisciplineForm({ initial, onSaved, onCancel }: { initial?: Discipline; onSaved: (message: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [workload, setWorkload] = useState(initial?.workload ?? 60);
  const [prerequisiteIds, setPrerequisiteIds] = useState<number[]>(initial?.prerequisites.map((p) => p.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Preencha o código e o nome da disciplina.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = { code: code.trim(), name: name.trim(), workload, prerequisiteIds };
      if (initial) await updateDiscipline(initial.id, input);
      else await createDiscipline(input);
      onSaved(initial ? 'Disciplina atualizada.' : 'Disciplina cadastrada.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-label={initial ? 'Editar disciplina' : 'Nova disciplina'}>
      <h2>{initial ? `Editar ${initial.code}` : 'Nova disciplina'}</h2>
      {error && <Notice notice={{ kind: 'error', text: error }} />}
      <div className="form-grid">
        <Field label="Código">
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
        </Field>
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Carga horária">
          <select value={workload} onChange={(e) => setWorkload(Number(e.target.value))}>
            {WORKLOADS.map((w) => (
              <option key={w} value={w}>
                {w}h
              </option>
            ))}
          </select>
        </Field>
      </div>
      <PrerequisitePicker selfId={initial?.id} selected={prerequisiteIds} onChange={setPrerequisiteIds} />
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
