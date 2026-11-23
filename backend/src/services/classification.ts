import type { DB } from '../db';
import { AppError } from '../errors';

export type Kind = 'MANDATORY' | 'PROFILE' | 'FREE';

/** Regra 10: a classificação depende do curso do aluno. */
export function classify(db: DB, courseId: number, disciplineId: number): Kind {
  const row = db
    .prepare('SELECT kind FROM course_disciplines WHERE course_id = ? AND discipline_id = ?')
    .get(courseId, disciplineId) as { kind: 'MANDATORY' | 'PROFILE' } | undefined;
  return row?.kind ?? 'FREE';
}

export function getStudent(db: DB, studentId: number) {
  const s = db.prepare('SELECT id, course_id AS courseId FROM users WHERE id = ? AND role = ?').get(studentId, 'STUDENT') as
    | { id: number; courseId: number }
    | undefined;
  if (!s) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Aluno não encontrado');
  return s;
}
