import { useState } from 'react';
import { Notice, type NoticeState } from '../../components/Notice';
import { PagedView } from '../../components/PagedView';
import { SearchBox } from '../../components/SearchBox';
import { usePagedSearch } from '../../hooks/usePagedSearch';
import { useResource } from '../../hooks/useResource';
import { listProfessors } from '../../services/professors';
import { ProfessorForm } from './ProfessorForm';

export function ProfessorsPage() {
  const { page, search, setPage, setSearch } = usePagedSearch();
  const list = useResource((signal) => listProfessors({ page, search }, signal), [page, search]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  return (
    <section>
      <div className="toolbar">
        <h1>Professores</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          Novo professor
        </button>
      </div>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      {creating && (
        <ProfessorForm
          onCancel={() => setCreating(false)}
          onSaved={(text) => {
            setCreating(false);
            setNotice({ kind: 'success', text });
            list.reload();
          }}
        />
      )}
      <SearchBox value={search} onSearch={setSearch} placeholder="Nome ou e-mail" />
      <PagedView resource={list} search={search} emptyText="Nenhum professor cadastrado." onPage={setPage}>
        {(items) => (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
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
