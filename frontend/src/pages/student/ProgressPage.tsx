import { AsyncView } from '../../components/AsyncView';
import { useResource } from '../../hooks/useResource';
import { getProgress } from '../../services/student';

const GROUPS = [
  ['mandatory', 'Obrigatórias'],
  ['profile', 'Eletivas de perfil'],
  ['free', 'Eletivas livres'],
] as const;

export function ProgressPage() {
  const progress = useResource((signal) => getProgress(signal), []);
  return (
    <section>
      <h1>Progresso no curso</h1>
      <AsyncView resource={progress}>
        {(p) => (
          <>
            <ul className="cards">
              {GROUPS.map(([key, label]) => {
                const g = p[key];
                return (
                  <li key={key} className="card" aria-label={label}>
                    <div className="card-head">
                      <strong>{label}</strong>
                      <span>{g.percent}% concluído</span>
                    </div>
                    <progress className="progress-bar" max={100} value={g.percent} aria-label={`${label}: ${g.percent}% concluído`} />
                    <dl className="stats">
                      <div><dt>Exigida</dt><dd>{g.required}h</dd></div>
                      <div><dt>Integralizada</dt><dd>{g.completed}h</dd></div>
                      <div><dt>Em curso</dt><dd>{g.inProgress}h</dd></div>
                      <div><dt>Falta</dt><dd>{g.remaining}h</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ul>
            <p className="muted">A carga em curso (matrículas ativas) não conta como integralizada até a aprovação.</p>
          </>
        )}
      </AsyncView>
    </section>
  );
}
