import { useState } from 'react';
import { Notice, type NoticeState } from '../../components/Notice';
import { PagedView } from '../../components/PagedView';
import { SearchBox } from '../../components/SearchBox';
import { usePagedSearch } from '../../hooks/usePagedSearch';
import { useResource } from '../../hooks/useResource';
import { errorMessage } from '../../services/api';
import { enroll, listOffers } from '../../services/student';
import type { Kind, Offer } from '../../types';

export const KIND_LABEL: Record<Kind, string> = {
  MANDATORY: 'Obrigatória',
  PROFILE: 'Eletiva de perfil',
  FREE: 'Eletiva livre',
};

function seatsText(o: Offer) {
  if (o.availableSeats <= 0) return 'Turma lotada';
  return `${o.availableSeats} ${o.availableSeats === 1 ? 'vaga disponível' : 'vagas disponíveis'} de ${o.capacity}`;
}

/** O que o botão da turma mostra: só "Matricular" quando a ação é possível. */
function action(o: Offer) {
  if (o.approved) return { label: 'Já aprovado', disabled: true };
  if (o.enrolled) return { label: 'Matriculado', disabled: true };
  if (o.availableSeats <= 0) return { label: 'Lotada', disabled: true };
  return { label: 'Matricular', disabled: false };
}

export function OffersPage() {
  const { page, search, setPage, setSearch } = usePagedSearch();
  const offers = useResource((signal) => listOffers({ page, search }, signal), [page, search]);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onEnroll(o: Offer) {
    setBusyId(o.id);
    setNotice(null);
    try {
      await enroll(o.id);
      setNotice({ kind: 'success', text: `Matrícula realizada em ${o.disciplineCode}.` });
    } catch (e) {
      setNotice({ kind: 'error', text: errorMessage(e) }); // mensagem da regra de negócio recusada
    } finally {
      setBusyId(null);
      offers.reload(); // as vagas podem ter mudado
    }
  }

  return (
    <section>
      <h1>Ofertas do semestre</h1>
      <SearchBox value={search} onSearch={setSearch} placeholder="Código, disciplina ou professor" />
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      <PagedView resource={offers} search={search} emptyText="Nenhuma turma aberta neste semestre." onPage={setPage}>
        {(items) => (
          <ul className="cards">
            {items.map((o) => (
              <li key={o.id} className="card">
                <div className="card-head">
                  <strong>
                    {o.disciplineCode} · {o.disciplineName}
                  </strong>
                  <span className={`badge badge-${o.kind.toLowerCase()}`}>{KIND_LABEL[o.kind]}</span>
                </div>
                <p className="muted">
                  {o.professorName} · {o.workload}h
                </p>
                <p className={o.availableSeats <= 0 ? 'seats seats-full' : 'seats'}>{seatsText(o)}</p>
                <div className="card-actions">
                  <button
                    className="btn btn-primary"
                    disabled={action(o).disabled || busyId === o.id}
                    aria-label={action(o).disabled ? undefined : `Matricular em ${o.disciplineCode}`}
                    onClick={() => onEnroll(o)}
                  >
                    {action(o).label}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PagedView>
    </section>
  );
}
