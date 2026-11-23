import type { DB } from '../db';
import { AppError } from '../errors';

export interface PrerequisiteRef {
  id: number;
  code: string;
  name: string;
}

export function getPrerequisites(db: DB, disciplineId: number): PrerequisiteRef[] {
  return db
    .prepare(
      `SELECT d.id, d.code, d.name FROM discipline_prerequisites p
       JOIN disciplines d ON d.id = p.prerequisite_id WHERE p.discipline_id = ? ORDER BY d.code`,
    )
    .all(disciplineId) as PrerequisiteRef[];
}

/** true se `from` depende, direta ou indiretamente, de `target`. */
function dependsOn(db: DB, from: number, target: number, seen = new Set<number>()): boolean {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  const next = db.prepare('SELECT prerequisite_id AS id FROM discipline_prerequisites WHERE discipline_id = ?').all(from) as { id: number }[];
  return next.some((n) => dependsOn(db, n.id, target, seen));
}

/** Substitui os pré-requisitos de uma disciplina. Recusa ids inexistentes, a própria disciplina e ciclos. */
export function setPrerequisites(db: DB, disciplineId: number, ids: number[]) {
  const unique = [...new Set(ids)];
  if (unique.includes(disciplineId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Uma disciplina não pode ser pré-requisito dela mesma');
  }
  for (const id of unique) {
    if (!db.prepare('SELECT 1 FROM disciplines WHERE id = ?').get(id)) {
      throw new AppError(404, 'DISCIPLINE_NOT_FOUND', `Pré-requisito ${id} não encontrado`);
    }
  }
  if (unique.some((id) => dependsOn(db, id, disciplineId))) {
    throw new AppError(409, 'PREREQUISITE_CYCLE', 'Os pré-requisitos escolhidos criariam um ciclo entre disciplinas');
  }
  db.prepare('DELETE FROM discipline_prerequisites WHERE discipline_id = ?').run(disciplineId);
  const insert = db.prepare('INSERT INTO discipline_prerequisites (discipline_id, prerequisite_id) VALUES (?, ?)');
  for (const id of unique) insert.run(disciplineId, id);
}

/** Códigos dos pré-requisitos em que o aluno ainda não tem aprovação (reprovação e matrícula ativa não contam). */
export function missingPrerequisites(db: DB, studentId: number, disciplineId: number): string[] {
  const rows = db
    .prepare(
      `SELECT d.code FROM discipline_prerequisites p JOIN disciplines d ON d.id = p.prerequisite_id
       WHERE p.discipline_id = ?
         AND NOT EXISTS (SELECT 1 FROM history h WHERE h.student_id = ? AND h.discipline_id = p.prerequisite_id AND h.status = 'APPROVED')
       ORDER BY d.code`,
    )
    .all(disciplineId, studentId) as { code: string }[];
  return rows.map((r) => r.code);
}
