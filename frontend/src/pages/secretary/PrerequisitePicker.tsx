import { AsyncView } from '../../components/AsyncView';
import { useResource } from '../../hooks/useResource';
import { listDisciplines } from '../../services/disciplines';

// A API limita a página a 100 itens; suficiente para este escopo (ver README).
const ALL = { page: 1, search: '', pageSize: 100 };

export function PrerequisitePicker({ selfId, selected, onChange }: { selfId?: number; selected: number[]; onChange: (ids: number[]) => void }) {
  const all = useResource((signal) => listDisciplines(ALL, signal), []);
  return (
    <fieldset className="field picker">
      <legend>Pré-requisitos</legend>
      <AsyncView
        resource={all}
        isEmpty={(p) => p.data.filter((d) => d.id !== selfId).length === 0}
        empty={<p className="muted">Nenhuma outra disciplina cadastrada.</p>}
      >
        {(p) => (
          <div className="chips">
            {p.data
              .filter((d) => d.id !== selfId)
              .map((d) => (
                <label key={d.id} className="chip">
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={(e) => onChange(e.target.checked ? [...selected, d.id] : selected.filter((x) => x !== d.id))}
                  />
                  {d.code}
                </label>
              ))}
          </div>
        )}
      </AsyncView>
    </fieldset>
  );
}
