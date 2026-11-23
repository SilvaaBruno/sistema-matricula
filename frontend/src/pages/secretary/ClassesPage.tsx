import { useState } from 'react';
import { Notice, type NoticeState } from '../../components/Notice';
import { PagedView } from '../../components/PagedView';
import { usePagedSearch } from '../../hooks/usePagedSearch';
import { useResource } from '../../hooks/useResource';
import { errorMessage } from '../../services/api';
import { listClasses, updateCapacity, type ClassRow } from '../../services/classes';
import { ClassForm } from './ClassForm';

function CapacityEditor({ row, onDone }: { row: ClassRow; onDone: (notice: NoticeState) => void }) {
  const [value, setValue] = useState(String(row.capacity));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateCapacity(row.id, Number(value));
      onDone({ kind: 'success', text: `Vagas de ${row.disciplineCode} atualizadas.` });
    } catch (err) {
      onDone({ kind: 'error', text: errorMessage(err) }); // ex.: vagas abaixo dos matriculados (regra 5)
    } finally {
      setBusy(false); // sem isso, uma falha deixava o botão Salvar travado
    }
  }

  return (
    <span className="inline-edit">
      <input type="number" min={1} aria-label={`Vagas de ${row.disciplineCode}`} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn btn-small btn-primary" disabled={busy} onClick={save}>
        Salvar
      </button>
    </span>
  );
}

export function ClassesPage() {
  const { page, setPage } = usePagedSearch();
  const list = useResource((signal) => listClasses(page, signal), [page]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  return (
    <section>
      <div className="toolbar">
        <h1>Turmas</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          Abrir turma
        </button>
      </div>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      {creating && (
        <ClassForm
          onCancel={() => setCreating(false)}
          onSaved={(text) => {
            setCreating(false);
            setNotice({ kind: 'success', text });
            list.reload();
          }}
        />
      )}
      <PagedView resource={list} search="" emptyText="Nenhuma turma aberta neste semestre." onPage={setPage}>
        {(items) => (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Professor</th>
                  <th>Vagas (ocupadas/totais)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.disciplineCode} · {c.disciplineName}
                    </td>
                    <td>{c.professorName}</td>
                    <td>
                      {c.occupied}/{c.capacity}
                    </td>
                    <td>
                      {editingId === c.id ? (
                        <CapacityEditor
                          row={c}
                          onDone={(n) => {
                            setNotice(n);
                            if (n.kind === 'success') setEditingId(null);
                            list.reload();
                          }}
                        />
                      ) : (
                        <button className="btn btn-small" aria-label={`Alterar vagas de ${c.disciplineCode}`} onClick={() => setEditingId(c.id)}>
                          Alterar vagas
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PagedView>
    </section>
  );
}
