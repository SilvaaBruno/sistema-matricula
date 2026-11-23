import { useState, type FormEvent } from 'react';
import { AsyncView } from '../../components/AsyncView';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { useResource } from '../../hooks/useResource';
import { errorMessage } from '../../services/api';
import { createClass } from '../../services/classes';
import { listDisciplines } from '../../services/disciplines';
import { listProfessors } from '../../services/professors';

// A API limita a página a 100 itens; para este escopo basta (registrado no README).
const ALL = { page: 1, search: '', pageSize: 100 };

export function ClassForm({ onSaved, onCancel }: { onSaved: (message: string) => void; onCancel: () => void }) {
  const options = useResource(async (signal) => {
    const [disciplines, professors] = await Promise.all([listDisciplines(ALL, signal), listProfessors(ALL, signal)]);
    return { disciplines: disciplines.data, professors: professors.data };
  }, []);
  const [disciplineId, setDisciplineId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const seats = Number(capacity);
    if (!disciplineId || !professorId) return setError('Escolha a disciplina e o professor.');
    if (!Number.isInteger(seats) || seats < 1) return setError('A turma precisa de pelo menos 1 vaga.');
    setBusy(true);
    setError(null);
    try {
      await createClass({ disciplineId: Number(disciplineId), professorId: Number(professorId), capacity: seats });
      onSaved('Turma aberta.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AsyncView resource={options}>
      {({ disciplines, professors }) => (
        <form className="card" onSubmit={submit} noValidate aria-label="Abrir turma">
          <h2>Abrir turma</h2>
          {error && <Notice notice={{ kind: 'error', text: error }} />}
          <div className="form-grid">
            <Field label="Disciplina">
              <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
                <option value="">Selecione…</option>
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Professor">
              <select value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
                <option value="">Selecione…</option>
                {professors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vagas">
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
          </div>
          <div className="card-actions">
            <button className="btn btn-primary" disabled={busy}>
              Abrir turma
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </AsyncView>
  );
}
