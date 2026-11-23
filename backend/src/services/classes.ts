import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../errors';
import type { Page } from '../pagination';

export const classSchema = z.object({
  disciplineId: z.number().int().positive(),
  professorId: z.number().int().positive(),
  capacity: z.number().int().min(1, 'A turma precisa de pelo menos 1 vaga'),
});
export const capacitySchema = z.object({
  capacity: z.number().int().min(1, 'A turma precisa de pelo menos 1 vaga'),
});

const OCCUPIED = `(SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id AND e.status = 'ACTIVE')`;

const SELECT_CLASS = `
  SELECT c.id, c.capacity, ${OCCUPIED} AS occupied,
         d.id AS disciplineId, d.code AS disciplineCode, d.name AS disciplineName, d.workload,
         p.id AS professorId, p.name AS professorName
  FROM classes c
  JOIN disciplines d ON d.id = c.discipline_id
  JOIN professors p ON p.id = c.professor_id`;

export function getClass(db: DB, id: number) {
  const row = db.prepare(`${SELECT_CLASS} WHERE c.id = ?`).get(id);
  if (!row) throw new AppError(404, 'CLASS_NOT_FOUND', 'Turma não encontrada');
  return row;
}

export function listClasses(db: DB, page: number, pageSize: number): Page<unknown> {
  const total = (db.prepare('SELECT COUNT(*) AS n FROM classes').get() as { n: number }).n;
  const data = db
    .prepare(`${SELECT_CLASS} ORDER BY d.code, c.id LIMIT ? OFFSET ?`)
    .all(pageSize, (page - 1) * pageSize);
  return { data, page, pageSize, total };
}

export function createClass(db: DB, input: z.infer<typeof classSchema>) {
  if (!db.prepare('SELECT 1 FROM disciplines WHERE id = ?').get(input.disciplineId)) {
    throw new AppError(404, 'DISCIPLINE_NOT_FOUND', 'Disciplina não encontrada');
  }
  if (!db.prepare('SELECT 1 FROM professors WHERE id = ?').get(input.professorId)) {
    throw new AppError(404, 'PROFESSOR_NOT_FOUND', 'Professor não encontrado');
  }
  const r = db
    .prepare('INSERT INTO classes (discipline_id, professor_id, capacity) VALUES (?, ?, ?)')
    .run(input.disciplineId, input.professorId, input.capacity);
  return getClass(db, Number(r.lastInsertRowid));
}

export function updateCapacity(db: DB, id: number, capacity: number) {
  return db.transaction(() => {
    const cls = getClass(db, id) as { occupied: number };
    if (capacity < cls.occupied) {
      throw new AppError(
        409,
        'CAPACITY_BELOW_ENROLLED',
        `A turma já tem ${cls.occupied} aluno(s) matriculado(s); as vagas não podem ser menores que isso`,
      );
    }
    db.prepare('UPDATE classes SET capacity = ? WHERE id = ?').run(capacity, id);
    return getClass(db, id);
  })();
}
