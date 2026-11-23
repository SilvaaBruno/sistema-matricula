import { useState } from 'react';
import { AsyncView } from '../../components/AsyncView';
import { Notice, type NoticeState } from '../../components/Notice';
import { useResource } from '../../hooks/useResource';
import { errorMessage } from '../../services/api';
import { cancelEnrollment, listEnrollments } from '../../services/student';
import type { Enrollment } from '../../types';

export function EnrollmentsPage() {
  const list = useResource((signal) => listEnrollments(signal), []);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onCancel(e: Enrollment) {
    setBusyId(e.id);
    setNotice(null);
    try {
      await cancelEnrollment(e.id);
      setNotice({ kind: 'success', text: `Matrícula em ${e.disciplineCode} cancelada. A vaga voltou para a turma.` });
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusyId(null);
      list.reload();
    }
  }

  return (
    <section>
      <h1>Minhas matrículas</h1>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      <AsyncView resource={list} isEmpty={(d) => d.length === 0} empty={<p>Você não tem matrículas ativas.</p>}>
        {(items) => (
          <ul className="cards">
            {items.map((e) => (
              <li key={e.id} className="card">
                <strong>
                  {e.disciplineCode} · {e.disciplineName}
                </strong>
                <p className="muted">
                  {e.professorName} · {e.workload}h
                </p>
                <div className="card-actions">
                  <button
                    className="btn btn-danger"
                    disabled={busyId === e.id}
                    aria-label={`Cancelar matrícula em ${e.disciplineCode}`}
                    onClick={() => onCancel(e)}
                  >
                    Cancelar matrícula
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </section>
  );
}
