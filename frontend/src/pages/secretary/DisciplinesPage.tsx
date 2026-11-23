import { useState } from 'react';
import { Notice, type NoticeState } from '../../components/Notice';
import { PagedView } from '../../components/PagedView';
import { SearchBox } from '../../components/SearchBox';
import { usePagedSearch } from '../../hooks/usePagedSearch';
import { useResource } from '../../hooks/useResource';
import { listDisciplines, type Discipline } from '../../services/disciplines';
import { DisciplineForm } from './DisciplineForm';

export function DisciplinesPage() {
  const { page, search, setPage, setSearch } = usePagedSearch();
  const list = useResource((signal) => listDisciplines({ page, search }, signal), [page, search]);
  const [editing, setEditing] = useState<Discipline | 'new' | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  return (
    <section>
      <div className="toolbar">
        <h1>Disciplinas</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          Nova disciplina
        </button>
      </div>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      {editing && (
        <DisciplineForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ kind: 'success', text });
            list.reload();
          }}
        />
      )}
      <SearchBox value={search} onSearch={setSearch} placeholder="Código ou nome" />
      <PagedView resource={list} search={search} emptyText="Nenhuma disciplina cadastrada." onPage={setPage}>
        {(items) => (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>CH</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>{d.code}</td>
                    <td>{d.name}</td>
                    <td>{d.workload}h</td>
                    <td>
                      <button className="btn btn-small" aria-label={`Editar ${d.code}`} onClick={() => setEditing(d)}>
                        Editar
                      </button>
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
