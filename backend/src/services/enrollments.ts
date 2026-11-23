import type { DB } from '../db';
import { AppError } from '../errors';
import { missingPrerequisites } from './prerequisites';

export function listActiveEnrollments(db: DB, studentId: number) {
  return db
    .prepare(
      `SELECT e.id, c.id AS classId, d.code AS disciplineCode, d.name AS disciplineName, d.workload,
              p.name AS professorName
       FROM enrollments e JOIN classes c ON c.id = e.class_id
       JOIN disciplines d ON d.id = c.discipline_id JOIN professors p ON p.id = c.professor_id
       WHERE e.student_id = ? AND e.status = 'ACTIVE' ORDER BY d.code`,
    )
    .all(studentId);
}

export function enroll(db: DB, studentId: number, classId: number) {
  return db.transaction(() => {
    const cls = db.prepare('SELECT id, discipline_id AS disciplineId, capacity FROM classes WHERE id = ?').get(classId) as
      | { id: number; disciplineId: number; capacity: number }
      | undefined;
    if (!cls) throw new AppError(404, 'CLASS_NOT_FOUND', 'Turma não encontrada');

    // Regra 7: aprovado não repete; reprovado pode cursar de novo.
    if (db.prepare(`SELECT 1 FROM history WHERE student_id = ? AND discipline_id = ? AND status = 'APPROVED'`).get(studentId, cls.disciplineId)) {
      throw new AppError(409, 'ALREADY_APPROVED', 'Você já foi aprovado nesta disciplina');
    }
    if (
      db.prepare(
        `SELECT 1 FROM enrollments e JOIN classes c ON c.id = e.class_id
         WHERE e.student_id = ? AND c.discipline_id = ? AND e.status = 'ACTIVE'`,
      ).get(studentId, cls.disciplineId)
    ) {
      throw new AppError(409, 'ALREADY_ENROLLED', 'Você já está matriculado nesta disciplina');
    }
    // Requisito extra: só matricula quem foi aprovado em todos os pré-requisitos da disciplina.
    const missing = missingPrerequisites(db, studentId, cls.disciplineId);
    if (missing.length > 0) {
      throw new AppError(409, 'PREREQUISITE_NOT_MET', `Pré-requisito(s) pendente(s): ${missing.join(', ')}`, { missing });
    }
    // Regra 6: turma lotada.
    const occupied = (db.prepare(`SELECT COUNT(*) AS n FROM enrollments WHERE class_id = ? AND status = 'ACTIVE'`).get(classId) as { n: number }).n;
    if (occupied >= cls.capacity) throw new AppError(409, 'CLASS_FULL', 'A turma está lotada');

    const r = db.prepare('INSERT INTO enrollments (student_id, class_id) VALUES (?, ?)').run(studentId, classId);
    return { id: Number(r.lastInsertRowid), classId, status: 'ACTIVE' };
  })();
}

/** Regras 8 e 9: só cancela a própria matrícula ativa; a vaga volta porque só contamos as ativas. */
export function cancel(db: DB, studentId: number, enrollmentId: number) {
  const e = db.prepare('SELECT id, status FROM enrollments WHERE id = ? AND student_id = ?').get(enrollmentId, studentId) as
    | { id: number; status: string }
    | undefined;
  if (!e) throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Matrícula não encontrada');
  if (e.status !== 'ACTIVE') throw new AppError(409, 'ENROLLMENT_NOT_ACTIVE', 'Esta matrícula já foi cancelada');
  db.prepare(`UPDATE enrollments SET status = 'CANCELLED' WHERE id = ?`).run(enrollmentId);
}
