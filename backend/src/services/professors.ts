import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../errors';
import { likePattern, type Page } from '../pagination';

export const professorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
});
export type ProfessorInput = z.infer<typeof professorSchema>;

interface Professor { id: number; name: string; email: string }

export function listProfessors(db: DB, page: number, pageSize: number, search?: string): Page<Professor> {
  const like = likePattern(search);
  const where = 'WHERE name LIKE ? OR email LIKE ?';
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM professors ${where}`).get(like, like) as { n: number }).n;
  const data = db
    .prepare(`SELECT id, name, email FROM professors ${where} ORDER BY name LIMIT ? OFFSET ?`)
    .all(like, like, pageSize, (page - 1) * pageSize) as Professor[];
  return { data, page, pageSize, total };
}

export function createProfessor(db: DB, input: ProfessorInput): Professor {
  if (db.prepare('SELECT 1 FROM professors WHERE email = ?').get(input.email)) {
    throw new AppError(409, 'PROFESSOR_EMAIL_TAKEN', 'Já existe um professor com esse e-mail');
  }
  const r = db.prepare('INSERT INTO professors (name, email) VALUES (?, ?)').run(input.name, input.email);
  return { id: Number(r.lastInsertRowid), ...input };
}
