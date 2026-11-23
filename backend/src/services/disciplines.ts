import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../errors';
import { likePattern, type Page } from '../pagination';
import { getPrerequisites, setPrerequisites, type PrerequisiteRef } from './prerequisites';

export const disciplineSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  workload: z
    .number()
    .int()
    .min(15)
    .max(120)
    .refine((n) => n % 15 === 0, 'A carga horária deve ser múltiplo de 15'),
  // PUT substitui a lista inteira de pré-requisitos.
  prerequisiteIds: z.array(z.number().int().positive()).max(20).default([]),
});
export type DisciplineInput = z.infer<typeof disciplineSchema>;

interface Discipline { id: number; code: string; name: string; workload: number; prerequisites: PrerequisiteRef[] }
type Row = Omit<Discipline, 'prerequisites'>;
const withPrerequisites = (db: DB, d: Row): Discipline => ({ ...d, prerequisites: getPrerequisites(db, d.id) });

export function listDisciplines(db: DB, page: number, pageSize: number, search?: string): Page<Discipline> {
  const like = likePattern(search);
  const where = 'WHERE code LIKE ? OR name LIKE ?';
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM disciplines ${where}`).get(like, like) as { n: number }).n;
  const data = db
    .prepare(`SELECT id, code, name, workload FROM disciplines ${where} ORDER BY code LIMIT ? OFFSET ?`)
    .all(like, like, pageSize, (page - 1) * pageSize) as Row[];
  return { data: data.map((d) => withPrerequisites(db, d)), page, pageSize, total };
}

function assertCodeFree(db: DB, code: string, exceptId?: number) {
  const row = db.prepare('SELECT id FROM disciplines WHERE code = ?').get(code) as { id: number } | undefined;
  if (row && row.id !== exceptId) {
    throw new AppError(409, 'DISCIPLINE_CODE_TAKEN', `Já existe uma disciplina com o código ${code}`);
  }
}

export function createDiscipline(db: DB, input: DisciplineInput): Discipline {
  return db.transaction(() => {
    assertCodeFree(db, input.code);
    const r = db
      .prepare('INSERT INTO disciplines (code, name, workload) VALUES (?, ?, ?)')
      .run(input.code, input.name, input.workload);
    const id = Number(r.lastInsertRowid);
    setPrerequisites(db, id, input.prerequisiteIds);
    return withPrerequisites(db, { id, code: input.code, name: input.name, workload: input.workload });
  })();
}

export function updateDiscipline(db: DB, id: number, input: DisciplineInput): Discipline {
  return db.transaction(() => {
    const exists = db.prepare('SELECT id FROM disciplines WHERE id = ?').get(id);
    if (!exists) throw new AppError(404, 'DISCIPLINE_NOT_FOUND', 'Disciplina não encontrada');
    assertCodeFree(db, input.code, id);
    db.prepare('UPDATE disciplines SET code = ?, name = ?, workload = ? WHERE id = ?').run(
      input.code, input.name, input.workload, id,
    );
    setPrerequisites(db, id, input.prerequisiteIds);
    return withPrerequisites(db, { id, code: input.code, name: input.name, workload: input.workload });
  })();
}
