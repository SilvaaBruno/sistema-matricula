import { PagedView } from '../../components/PagedView';
import { SearchBox } from '../../components/SearchBox';
import { usePagedSearch } from '../../hooks/usePagedSearch';
import { useResource } from '../../hooks/useResource';
import { listOffers } from '../../services/student';
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

export function OffersPage() {
  const { page, search, setPage, setSearch } = usePagedSearch();
  const offers = useResource((signal) => listOffers({ page, search }, signal), [page, search]);

  return (
    <section>
      <h1>Ofertas do semestre</h1>
      <SearchBox value={search} onSearch={setSearch} placeholder="Código, disciplina ou professor" />
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
              </li>
            ))}
          </ul>
        )}
      </PagedView>
    </section>
  );
}
